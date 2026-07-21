import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CalendarDays, Cookie, MapPin, Shirt, Sparkles, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { supabase } from "@/integrations/supabase/client";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useLocationPermission } from "@/hooks/use-location-permission";
import { useVisionPreferences, type VisionPreset } from "@/hooks/use-vision-preferences";
import { toast } from "sonner";

const HEARD_ABOUT_OPTIONS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Reddit",
  "Friend / word of mouth",
  "Google search",
  "App Store",
  "News / article",
  "Other",
];

const FEATURES = [
  { icon: Bot, title: "Ask Rejn", text: "Chat with our AI meteorologist about your local weather." },
  { icon: CalendarDays, title: "15-day forecasts", text: "Ensemble forecasts synced to your calendar." },
  { icon: MapPin, title: "Saved places", text: "Track weather across every city that matters to you." },
  { icon: Shirt, title: "Outfit picks", text: "Get dressed for the actual weather, not the app icon." },
  { icon: ShieldCheck, title: "Trust every day", text: "Confidence scores on every forecast." },
];

const VISION_PRESETS: { id: VisionPreset; label: string; desc: string; emoji: string }[] = [
  { id: "standard", label: "No adjustments", desc: "I see the app just fine.", emoji: "◯" },
  { id: "low-vision", label: "Low vision", desc: "Bigger, bolder, higher contrast.", emoji: "🔍" },
  { id: "aniridia", label: "Aniridia / light sensitive", desc: "Dim, warm, glare-free UI.", emoji: "🌒" },
  { id: "color-blind", label: "Color blind", desc: "Extra patterns and labels.", emoji: "🎨" },
  { id: "screen-reader", label: "Screen reader user", desc: "Verbose labels, no motion.", emoji: "🔊" },
];

type StepId = "cookies" | "location" | "features" | "vision" | "source" | "thanks";
const STEPS: StepId[] = ["cookies", "location", "features", "vision", "source", "thanks"];

export default function Welcome() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [source, setSource] = useState<string | null>(null);
  const [otherSource, setOtherSource] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const { applyPreset, prefs } = useVisionPreferences();

  const { acceptAll, declineAll } = useCookieConsent();
  const { persist: persistLocation } = useLocationPermission();
  const step = STEPS[stepIdx];
  const progress = useMemo(() => ((stepIdx + 1) / STEPS.length) * 100, [stepIdx]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth", { replace: true }); return; }
      setUserId(user.id);
    })();
  }, [navigate]);

  useEffect(() => {
    import("@amplitude/unified").then((amp) => amp.track("onboarding_step_view", { step })).catch(() => {});
  }, [step]);

  const advance = async () => {
    import("@amplitude/unified").then((amp) => amp.track("onboarding_step_complete", { step })).catch(() => {});
    if (stepIdx < STEPS.length - 1) {
      if (userId) {
        await supabase.from("profiles").update({ onboarding_step: STEPS[stepIdx + 1] } as any).eq("user_id", userId);
      }
      setStepIdx(stepIdx + 1);
    } else {
      await finish();
    }
  };

  const finish = async () => {
    if (userId) {
      await supabase.from("profiles").update({ onboarding_step: "done" } as any).eq("user_id", userId);
    }
    navigate("/", { replace: true });
  };

  const handleCookies = async (choice: "accept" | "decline") => {
    if (choice === "accept") acceptAll(); else declineAll();
    advance();
  };

  const handleLocation = async (choice: "granted" | "denied") => {
    if (choice === "granted" && typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        await persistLocation("granted");
      } catch {
        await persistLocation("denied");
        toast.info("No worries — you can enable location later in Settings.");
      }
    } else {
      await persistLocation("denied");
    }
    advance();
  };

  const handleSource = async () => {
    const value = source === "Other" ? (otherSource.trim() || "Other") : source;
    if (userId && value) {
      await supabase.from("profiles").update({ acquisition_source: value } as any).eq("user_id", userId);
    }
    import("@amplitude/unified").then((amp) => {
      if (value) {
        amp.track("acquisition_source_selected", { source: value });
        try { amp.identify(new amp.Identify().set("acquisition_source", value)); } catch { /* older SDK */ }
      }
    }).catch(() => {});
    advance();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>Step {stepIdx + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
          <motion.div className="h-full bg-primary" initial={false} animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card/50 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === "cookies" && (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Cookie className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">Cookies?</h1>
                <p className="text-sm text-muted-foreground">
                  We use a small crumb of analytics to make Rejn better. No selling, no ads.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleCookies("decline")}>Only essentials</Button>
                  <Button className="flex-1" onClick={() => handleCookies("accept")}>Accept</Button>
                </div>
              </div>
            )}

            {step === "location" && (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">Where are you?</h1>
                <p className="text-sm text-muted-foreground">
                  Rejn works best with your location so it can pick the right sky.
                  We'll remember your choice — you won't be asked again.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleLocation("denied")}>Not now</Button>
                  <Button className="flex-1" onClick={() => handleLocation("granted")}>Allow</Button>
                </div>
              </div>
            )}

            {step === "features" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold">A quick tour</h1>
                  <p className="text-sm text-muted-foreground">Here's what makes Rejn different.</p>
                </div>
                <div className="grid gap-2">
                  {FEATURES.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/40 p-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-muted-foreground">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={advance}>Continue</Button>
              </div>
            )}

            {step === "vision" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h1 className="text-2xl font-bold">Any vision needs?</h1>
                  <p className="text-sm text-muted-foreground">
                    Rejn is built for everyone. Pick a profile — you can change it any time in Settings.
                  </p>
                </div>
                <div role="radiogroup" aria-label="Vision profile" className="grid grid-cols-1 gap-2">
                  {VISION_PRESETS.map((opt) => {
                    const active = prefs.preset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => applyPreset(opt.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                            : "border-border/40 bg-card/40 hover:bg-card/70"
                        }`}
                      >
                        <span className="text-2xl leading-none" aria-hidden>{opt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button className="w-full" onClick={advance}>Continue</Button>
              </div>
            )}

            {step === "source" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold">How'd you hear about us?</h1>
                  <p className="text-sm text-muted-foreground">Helps us know where our people are.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {HEARD_ABOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSource(opt)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                        source === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-card/40 text-foreground/80 hover:bg-card/70"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {source === "Other" && (
                  <input
                    type="text"
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    placeholder="Tell us where…"
                    className="w-full rounded-xl border border-border/40 bg-card/40 px-3 py-2 text-sm"
                  />
                )}
                <Button className="w-full" disabled={!source} onClick={handleSource}>Continue</Button>
              </div>
            )}

            {step === "thanks" && (
              <div className="space-y-5 text-center">
                <RejnMascot pose="dance" className="mx-auto w-24 h-24" />
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                  Thanks for using Rejn <Sparkles className="h-5 w-5 text-primary" />
                </h1>
                <p className="text-sm text-muted-foreground">
                  You're all set. Let's check what the sky's up to.
                </p>
                <Button className="w-full" size="lg" onClick={finish}>Open Rejn</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
