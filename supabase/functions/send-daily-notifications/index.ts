import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const nowUtc = new Date();
    const currentHour = nowUtc.getUTCHours();
    const hourStr = `${String(currentHour).padStart(2, "0")}:`;

    // All users with notifications enabled scheduled for this hour
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id, notification_enabled, notification_time, display_name")
      .eq("notification_enabled", true);

    if (profilesErr) {
      console.error("Error fetching profiles:", profilesErr);
      return new Response(JSON.stringify({ error: profilesErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchingUsers = (profiles || []).filter((p) => {
      if (!p.notification_time) return currentHour === 8;
      return p.notification_time.startsWith(hourStr);
    });

    if (matchingUsers.length === 0) {
      console.log(`No users scheduled for hour ${currentHour} UTC`);
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = matchingUsers.map((u) => u.user_id);

    // Push subscriptions (for the existing push notification path)
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", userIds);
    const subscribedUserIds = new Set((subs || []).map((s) => s.user_id));

    // Preferences + primary locations
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("user_id, language, premium_settings")
      .in("user_id", userIds);
    const { data: locations } = await supabase
      .from("saved_locations")
      .select("user_id, name, latitude, longitude")
      .in("user_id", userIds)
      .eq("is_primary", true);

    const prefMap = new Map((preferences || []).map((p) => [p.user_id, p]));
    const locMap = new Map((locations || []).map((l) => [l.user_id, l]));
    const profMap = new Map(matchingUsers.map((p) => [p.user_id, p]));

    let pushSent = 0;
    let emailSent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const pref = prefMap.get(userId);
        const loc = locMap.get(userId);
        const prof = profMap.get(userId);
        const language = (pref?.language as string) || "en";
        const premiumSettings = (pref?.premium_settings as Record<string, unknown>) || {};
        const useCelsius = premiumSettings?.temperatureUnit !== "fahrenheit";
        const unit = useCelsius ? "°C" : "°F";

        // Build weather data + localized fields
        let pushTitle = greeting(language);
        let pushBody = noLocationBody(language);
        let weather: WeatherFields | null = null;

        if (loc) {
          weather = await fetchWeather(loc, useCelsius, language);
          if (weather) {
            pushBody = `${loc.name}: ${weather.temperature}${unit}, ${weather.condition} (H:${weather.high}${unit} L:${weather.low}${unit})`;
          }
        }

        // 1) Push notification (only if subscribed)
        if (subscribedUserIds.has(userId)) {
          const { error: pushErr } = await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title: pushTitle,
              body: pushBody,
              data: { type: "morning_review" },
            },
          });
          if (pushErr) console.warn(`Push failed for ${userId}:`, pushErr.message);
          else pushSent++;
        }

        // 2) Email — fetch the user's email via auth admin
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
        if (userErr || !userData?.user?.email) {
          continue;
        }
        const recipientEmail = userData.user.email;

        // Build AI summary + tip in the user's language (with graceful fallback)
        const ai = await generateMorningSummary({ language, location: loc, weather });

        const dateStr = formatDate(language);
        const idempotencyKey = `morning-review-${userId}-${nowUtc.toISOString().slice(0, 10)}`;

        const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "morning-review",
            recipientEmail,
            idempotencyKey,
            templateData: {
              name: prof?.display_name ?? null,
              language,
              locationName: loc?.name ?? "",
              temperature: weather?.temperature ?? "",
              high: weather?.high ?? "",
              low: weather?.low ?? "",
              condition: weather?.condition ?? "",
              summary: ai.summary,
              tip: ai.tip,
              unit,
              date: dateStr,
              appUrl: "https://rainz.net",
            },
          },
        });

        if (emailErr) {
          console.warn(`Email failed for ${userId}:`, emailErr.message);
          failed++;
        } else {
          emailSent++;
        }
      } catch (userErr) {
        console.error(`Error processing user ${userId}:`, userErr);
        failed++;
      }
    }

    console.log(`Morning reviews — pushSent=${pushSent}, emailSent=${emailSent}, failed=${failed}`);
    return new Response(
      JSON.stringify({ pushSent, emailSent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------------- helpers ----------------

interface WeatherFields {
  temperature: string;
  high: string;
  low: string;
  condition: string;
}

async function fetchWeather(
  loc: { name: string; latitude: number; longitude: number },
  useCelsius: boolean,
  language: string,
): Promise<WeatherFields | null> {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`,
    );
    const w = await r.json();
    if (!w?.current) return null;
    const round = (n: number) =>
      useCelsius ? Math.round(n).toString() : Math.round((n * 9) / 5 + 32).toString();

    return {
      temperature: round(w.current.temperature_2m),
      high: w.daily?.temperature_2m_max?.[0] != null ? round(w.daily.temperature_2m_max[0]) : "",
      low: w.daily?.temperature_2m_min?.[0] != null ? round(w.daily.temperature_2m_min[0]) : "",
      condition: getConditionText(w.current.weather_code ?? 0, language),
    };
  } catch (e) {
    console.error("Weather fetch failed:", (e as Error).message);
    return null;
  }
}

async function generateMorningSummary({
  language,
  location,
  weather,
}: {
  language: string;
  location: { name: string } | undefined;
  weather: WeatherFields | null;
}): Promise<{ summary: string; tip: string }> {
  // Sensible localized fallback if Groq isn't available or fails
  const fallback = buildFallback(language, location?.name, weather);
  if (!GROQ_API_KEY || !weather) return fallback;

  try {
    const langName = languageDisplayName(language);
    const prompt = `Write a friendly 2-sentence morning weather review and one short practical tip for today's weather.

Location: ${location?.name ?? "Unknown"}
Current: ${weather.temperature}°, ${weather.condition}
High: ${weather.high}°, Low: ${weather.low}°

Reply in ${langName}. Return ONLY a JSON object with this exact shape (no markdown, no commentary):
{"summary": "...", "tip": "..."}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are a friendly weather presenter. Always reply in ${langName}.` },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback;

    const parsed = JSON.parse(text);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      tip: typeof parsed.tip === "string" ? parsed.tip : fallback.tip,
    };
  } catch (e) {
    console.warn("Groq summary failed, using fallback:", (e as Error).message);
    return fallback;
  }
}

function buildFallback(
  language: string,
  locationName: string | undefined,
  w: WeatherFields | null,
): { summary: string; tip: string } {
  const loc = locationName ?? "";
  if (!w) {
    return language === "no"
      ? { summary: "Ha en flott dag — sjekk Rainz for dagens prognose.", tip: "Kle deg etter været." }
      : { summary: "Have a great day — check Rainz for today's forecast.", tip: "Dress for the weather." };
  }
  const map: Record<string, { summary: string; tip: string }> = {
    en: {
      summary: `${loc ? loc + ": " : ""}${w.condition} with a high of ${w.high}° and low of ${w.low}°.`,
      tip: "Dress in layers and keep an eye on the sky.",
    },
    no: {
      summary: `${loc ? loc + ": " : ""}${w.condition} med høy ${w.high}° og lav ${w.low}°.`,
      tip: "Kle deg i lag og følg med på himmelen.",
    },
    sv: {
      summary: `${loc ? loc + ": " : ""}${w.condition} med högsta ${w.high}° och lägsta ${w.low}°.`,
      tip: "Klä dig i lager och håll koll på himlen.",
    },
    da: {
      summary: `${loc ? loc + ": " : ""}${w.condition} med højeste ${w.high}° og laveste ${w.low}°.`,
      tip: "Klæd dig i lag og hold øje med himlen.",
    },
    de: {
      summary: `${loc ? loc + ": " : ""}${w.condition}, Höchstwert ${w.high}°, Tiefstwert ${w.low}°.`,
      tip: "Zwiebellook anziehen und den Himmel im Auge behalten.",
    },
    fr: {
      summary: `${loc ? loc + " : " : ""}${w.condition}, max ${w.high}°, min ${w.low}°.`,
      tip: "Habillez-vous en couches et surveillez le ciel.",
    },
    es: {
      summary: `${loc ? loc + ": " : ""}${w.condition} con máxima de ${w.high}° y mínima de ${w.low}°.`,
      tip: "Vístete en capas y atento al cielo.",
    },
  };
  return map[language] ?? map.en;
}

function greeting(lang: string): string {
  const m: Record<string, string> = {
    en: "Good Morning! ☀️",
    no: "God morgen! ☀️",
    sv: "God morgon! ☀️",
    da: "Godmorgen! ☀️",
    de: "Guten Morgen! ☀️",
    fr: "Bonjour ! ☀️",
    es: "¡Buenos días! ☀️",
  };
  return m[lang] ?? m.en;
}

function noLocationBody(lang: string): string {
  const m: Record<string, string> = {
    en: "Check your weather forecast for today.",
    no: "Sjekk værvarsel for i dag.",
    sv: "Kolla dagens väderprognos.",
    da: "Tjek dagens vejrudsigt.",
    de: "Sieh dir die heutige Vorhersage an.",
    fr: "Consultez les prévisions du jour.",
    es: "Revisa el pronóstico de hoy.",
  };
  return m[lang] ?? m.en;
}

function languageDisplayName(lang: string): string {
  const m: Record<string, string> = {
    en: "English",
    no: "Norwegian (Bokmål)",
    sv: "Swedish",
    da: "Danish",
    de: "German",
    fr: "French",
    es: "Spanish",
  };
  return m[lang] ?? "English";
}

function formatDate(lang: string): string {
  const localeMap: Record<string, string> = {
    en: "en-US",
    no: "nb-NO",
    sv: "sv-SE",
    da: "da-DK",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
  };
  try {
    return new Date().toLocaleDateString(localeMap[lang] ?? "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toDateString();
  }
}

function getConditionText(code: number, lang: string): string {
  const c: Record<number, Record<string, string>> = {
    0: { en: "Clear sky", no: "Klar himmel", sv: "Klar himmel", da: "Klar himmel", de: "Klarer Himmel", fr: "Ciel dégagé", es: "Cielo despejado" },
    1: { en: "Mostly clear", no: "Delvis klart", sv: "Mestadels klart", da: "Overvejende klart", de: "Überwiegend klar", fr: "Plutôt dégagé", es: "Mayormente despejado" },
    2: { en: "Partly cloudy", no: "Delvis skyet", sv: "Delvis molnigt", da: "Delvist skyet", de: "Teilweise bewölkt", fr: "Partiellement nuageux", es: "Parcialmente nublado" },
    3: { en: "Overcast", no: "Overskyet", sv: "Mulet", da: "Overskyet", de: "Bedeckt", fr: "Couvert", es: "Nublado" },
    45: { en: "Foggy", no: "Tåke", sv: "Dimma", da: "Tåge", de: "Neblig", fr: "Brumeux", es: "Niebla" },
    48: { en: "Rime fog", no: "Rimtåke", sv: "Rimfrostdimma", da: "Rimtåge", de: "Reifnebel", fr: "Brouillard givrant", es: "Niebla helada" },
    51: { en: "Light drizzle", no: "Lett yr", sv: "Lätt duggregn", da: "Let støvregn", de: "Leichter Nieselregen", fr: "Bruine légère", es: "Llovizna ligera" },
    53: { en: "Drizzle", no: "Yr", sv: "Duggregn", da: "Støvregn", de: "Nieselregen", fr: "Bruine", es: "Llovizna" },
    55: { en: "Heavy drizzle", no: "Kraftig yr", sv: "Kraftigt duggregn", da: "Kraftig støvregn", de: "Starker Nieselregen", fr: "Bruine forte", es: "Llovizna fuerte" },
    61: { en: "Light rain", no: "Lett regn", sv: "Lätt regn", da: "Let regn", de: "Leichter Regen", fr: "Pluie légère", es: "Lluvia ligera" },
    63: { en: "Rain", no: "Regn", sv: "Regn", da: "Regn", de: "Regen", fr: "Pluie", es: "Lluvia" },
    65: { en: "Heavy rain", no: "Kraftig regn", sv: "Kraftigt regn", da: "Kraftig regn", de: "Starker Regen", fr: "Pluie forte", es: "Lluvia fuerte" },
    71: { en: "Light snow", no: "Lett snø", sv: "Lätt snö", da: "Let sne", de: "Leichter Schnee", fr: "Neige légère", es: "Nieve ligera" },
    73: { en: "Snow", no: "Snø", sv: "Snö", da: "Sne", de: "Schnee", fr: "Neige", es: "Nieve" },
    75: { en: "Heavy snow", no: "Kraftig snø", sv: "Kraftig snö", da: "Kraftig sne", de: "Starker Schnee", fr: "Neige forte", es: "Nieve fuerte" },
    80: { en: "Rain showers", no: "Regnbyger", sv: "Regnskurar", da: "Regnbyger", de: "Regenschauer", fr: "Averses", es: "Chubascos" },
    95: { en: "Thunderstorm", no: "Tordenvær", sv: "Åskväder", da: "Tordenvejr", de: "Gewitter", fr: "Orage", es: "Tormenta" },
  };
  const entry = c[code] ?? c[0];
  return entry[lang] ?? entry.en;
}
