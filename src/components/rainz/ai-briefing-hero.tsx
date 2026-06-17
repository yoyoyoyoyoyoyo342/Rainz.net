import { useEffect, useRef, useState } from "react";
import { Sparkles, Volume2, VolumeX, RefreshCw, Flame } from "lucide-react";
import { RainzCard } from "@/components/rainz/rainz-card";

interface AIBriefingHeroProps {
  location: string;
  currentTemp?: number;
  feelsLike?: number;
  condition?: string;
  hourly?: Array<{ time: string; temperature: number; condition: string; precipitation: number }>;
  isImperial?: boolean;
  footer?: React.ReactNode;
  streak?: number;
}


// Rainz 2.0 — Streaming AI weather briefing hero.
// Hits supabase/functions/ai-briefing with SSE, renders tokens as they arrive.
export function AIBriefingHero({
  location,
  currentTemp,
  feelsLike,
  condition,
  hourly,
  isImperial,
  footer,
}: AIBriefingHeroProps) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [muted, setMuted] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const utteredRef = useRef(false);

  const unit = isImperial ? "°F" : "°C";

  const run = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    setText("");
    utteredRef.current = false;
    // Amplitude: briefing requested
    import("@amplitude/unified")
      .then((amp) => amp.track("ai_briefing_requested", { location, unit }))
      .catch(() => {});

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-briefing`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          location,
          current: { temperature: currentTemp, feelsLike, condition },
          next12h: hourly?.slice(0, 12) ?? [],
          isImperial,
          hourLocal: new Date().getHours(),
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      let acc = "";
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              acc += chunk;
              setText(acc);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Voice playback (after stream completes)
      if (!muted && acc && "speechSynthesis" in window && !utteredRef.current) {
        utteredRef.current = true;
        const u = new SpeechSynthesisUtterance(acc);
        u.rate = 1.05;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("ai-briefing stream failed", e);
        if (!text) setText(`${location}: ${currentTemp !== undefined ? `${Math.round(currentTemp)}${unit}, ` : ""}${condition || "current conditions"}. Briefing offline — try again in a moment.`);
      }
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (!location) return;
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, currentTemp, condition]);

  const toggleVoice = () => {
    if (!muted) {
      window.speechSynthesis?.cancel();
      setMuted(true);
      return;
    }
    setMuted(false);
    if (text && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <RainzCard variant="ai" glow="blue" shimmer={streaming} className="mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-200" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-200/70">
              Rejn AI · Today's briefing
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={muted ? "Play briefing" : "Stop briefing"}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-100/80"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={run}
                disabled={streaming}
                aria-label="Refresh briefing"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-100/80 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${streaming ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <p
            className="text-[15px] sm:text-base leading-relaxed text-white/95 font-medium"
            aria-live="polite"
            aria-busy={streaming}
          >
            {text || (streaming ? "Reading the sky…" : "")}
            {streaming && (
              <span className="inline-block w-[2px] h-[1em] bg-blue-200 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
          {currentTemp !== undefined && (
            <div className="mt-3 flex items-baseline gap-3 text-white/80">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {Math.round(currentTemp)}<span className="text-base font-medium opacity-70">{unit}</span>
              </span>
              {feelsLike !== undefined && (
                <span className="text-xs opacity-60">feels {Math.round(feelsLike)}{unit}</span>
              )}
              {condition && (
                <span className="text-xs opacity-60 capitalize">· {condition}</span>
              )}
            </div>
          )}
          {footer && <div className="mt-3">{footer}</div>}
        </div>
      </div>
    </RainzCard>
  );
}
