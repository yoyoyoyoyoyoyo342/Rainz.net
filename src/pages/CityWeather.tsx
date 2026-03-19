import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudRain, Droplets, Wind, Thermometer, MapPin, Navigation, ArrowRight, Umbrella } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CITY_MAP, CITIES } from "@/data/cities";
import { weatherApi } from "@/lib/weather-api";
import { SEOHead } from "@/components/seo/seo-head";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";
import { AnimatedWeatherBackground } from "@/components/weather/animated-weather-background";
import { supabase } from "@/integrations/supabase/client";

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return <CloudRain className="h-8 w-8 text-blue-400" />;
  if (c.includes("cloud") || c.includes("overcast")) return <Cloud className="h-8 w-8 text-muted-foreground" />;
  return <Thermometer className="h-8 w-8 text-yellow-400" />;
}

function useCityDescription(city: { slug: string; name: string; country: string; lat: number; lon: number; description: string } | undefined) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) { setLoading(false); return; }

    let cancelled = false;

    async function fetchDescription() {
      try {
        // 1. Check Supabase cache
        const { data: cached } = await supabase
          .from("city_pages")
          .select("description")
          .eq("slug", city!.slug)
          .maybeSingle();

        if (cached?.description && !cancelled) {
          setDescription(cached.description);
          setLoading(false);
          return;
        }

        // 2. Call edge function to generate & cache
        const { data, error } = await supabase.functions.invoke("generate-city-description", {
          body: {
            slug: city!.slug,
            city_name: city!.name,
            country: city!.country,
            latitude: city!.lat,
            longitude: city!.lon,
          },
        });

        if (!cancelled) {
          if (data?.description) {
            setDescription(data.description);
          } else {
            // Fallback to static description from cities.ts
            setDescription(city!.description);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDescription(city!.description);
          setLoading(false);
        }
      }
    }

    fetchDescription();
    return () => { cancelled = true; };
  }, [city?.slug]);

  return { description: description || city?.description || "", loading };
}

export default function CityWeather() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? CITY_MAP.get(citySlug) : undefined;

  const { description, loading: descLoading } = useCityDescription(city);

  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ["city-weather", city?.slug],
    queryFn: () => weatherApi.getWeatherData(city!.lat, city!.lon, city!.name),
    enabled: !!city,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Inject schema markup
  useEffect(() => {
    if (!city) return;
    const id = "city-schema-ld";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.setAttribute("type", "application/ld+json");
      document.head.appendChild(el);
    }
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: "Rainz Weather",
          url: "https://rainz.net",
          applicationCategory: "WeatherApplication",
          operatingSystem: "Web, iOS, Android",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: `Live rain forecast and weather data for ${city.name} powered by AI.`,
        },
        {
          "@type": "City",
          name: city.name,
          geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon },
        },
        {
          "@type": "WebPage",
          name: `Rain Forecast & Weather in ${city.name} | Rainz.net`,
          url: `https://rainz.net/weather/${city.slug}`,
          description: `Check live rain radar, hourly forecasts, and plan rain-free routes in ${city.name} with Rainz.`,
          isPartOf: { "@type": "WebSite", name: "Rainz.net", url: "https://rainz.net" },
        },
      ],
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [city]);

  if (!city) return <Navigate to="/" replace />;

  const current = weatherData?.mostAccurate?.currentWeather;
  const hourly = weatherData?.mostAccurate?.hourlyForecast?.slice(0, 12) ?? [];
  const condition = current?.condition ?? "Loading";

  const dryRoutesUrl = `/dryroutes?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(city.name)}`;
  const dryRoutesEmbedUrl = `${window.location.origin}/dryroutes?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(city.name)}&embed=1`;

  return (
    <>
      <SEOHead
        title={`Rain Forecast & Weather in ${city.name} | Rainz.net`}
        description={`Check live rain radar, hourly forecasts, and plan rain-free routes in ${city.name} with Rainz — the free AI-powered weather app.`}
        keywords={`${city.name} weather, ${city.name} rain forecast, ${city.name} rain radar, weather ${city.name}, rain ${city.name}`}
        canonicalUrl={`https://rainz.net/weather/${city.slug}`}
        ogType="website"
      />

      <div className="min-h-screen relative">
        {current && (
          <AnimatedWeatherBackground condition={condition} />
        )}

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 md:py-10">
          {/* Header */}
          <div className="mb-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-3">
              <MapPin className="h-3 w-3" /> Rainz.net
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
              Weather & Rain Forecast in {city.name}
            </h1>
          </div>

          {/* City Description — AI-generated & cached */}
          <Card className="glass-card mb-4">
            <CardContent className="p-4">
              {descLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-full" />
                  <div className="h-4 bg-muted/30 rounded w-3/4" />
                </div>
              ) : (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </CardContent>
          </Card>

          {isLoading ? (
            <WeatherPageSkeleton />
          ) : error ? (
            <Card className="glass-card mb-4">
              <CardContent className="p-6 text-center">
                <CloudRain className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Unable to load weather data. Please try again later.</p>
              </CardContent>
            </Card>
          ) : current ? (
            <>
              {/* Current Conditions */}
              <Card className="glass-card mb-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-foreground">
                        {Math.round(current.temperature)}°F
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Feels like {Math.round(current.feelsLike)}°F
                      </div>
                    </div>
                    <div className="text-right">
                      {getWeatherIcon(condition)}
                      <div className="text-sm font-medium text-foreground mt-1">{condition}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                      <div className="text-xs text-muted-foreground">Humidity</div>
                      <div className="text-sm font-medium text-foreground">{current.humidity}%</div>
                    </div>
                    <div className="text-center">
                      <Wind className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground">Wind</div>
                      <div className="text-sm font-medium text-foreground">{Math.round(current.windSpeed)} mph</div>
                    </div>
                    <div className="text-center">
                      <Umbrella className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                      <div className="text-xs text-muted-foreground">Pressure</div>
                      <div className="text-sm font-medium text-foreground">{current.pressure} hPa</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hourly Rain Forecast */}
              <Card className="glass-card mb-4">
                <CardContent className="p-4">
                  <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-blue-400" />
                    Hourly Rain Forecast
                  </h2>
                  <div className="overflow-x-auto -mx-2 px-2">
                    <div className="flex gap-2 min-w-max pb-1">
                      {hourly.map((h, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[56px] p-2 rounded-xl bg-background/30">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{h.time}</span>
                          {getWeatherIcon(h.condition)}
                          <span className="text-xs font-medium text-foreground">{Math.round(h.temperature)}°</span>
                          <div className="flex items-center gap-0.5">
                            <Droplets className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] text-blue-400 font-medium">{h.precipitation}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DryRoutes Embed + CTA */}
              <Card className="glass-card mb-6 border-primary/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-primary/5 px-4 pt-4 pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <Navigation className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-base md:text-lg font-bold text-foreground">
                          DryRoutes in {city.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Find the driest path for walking, cycling or driving
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Tall iframe embed of DryRoutes */}
                  <div className="w-full h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] bg-background/20">
                    <iframe
                      src={dryRoutesEmbedUrl}
                      className="w-full h-full border-0"
                      title={`DryRoutes map for ${city.name}`}
                      loading="lazy"
                      allow="geolocation"
                    />
                  </div>
                  <div className="px-4 py-3 border-t border-border/30">
                    <Link to={dryRoutesUrl}>
                      <Button className="w-full gap-2 h-11 text-sm" size="lg">
                        <Navigation className="h-4 w-4" />
                        Open Full DryRoutes
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {/* Internal links to other cities */}
          <Card className="glass-card mb-6">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Weather in Other Cities</h2>
              <div className="flex flex-wrap gap-1.5">
                {CITIES
                  .filter(c => c.slug !== city.slug)
                  .slice(0, 12)
                  .map(c => (
                    <Link
                      key={c.slug}
                      to={`/weather/${c.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-background/40 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors border border-border/30"
                    >
                      {c.name}
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Back to main */}
          <div className="text-center pb-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Rainz.net Weather
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
