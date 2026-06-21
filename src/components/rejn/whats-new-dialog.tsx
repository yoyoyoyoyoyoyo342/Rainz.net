import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, CalendarDays, Sparkles, Shirt, Map, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "rejn_whatsnew_2_seen";
// Window: June 21–28, 2026 (inclusive)
const WINDOW_START = new Date("2026-06-21T00:00:00Z").getTime();
const WINDOW_END = new Date("2026-06-29T00:00:00Z").getTime();

const features = [
  { icon: Bot, title: "AI Sky Analyst", text: "Ask Rejn anything about your local weather." },
  { icon: CalendarDays, title: "Weather Calendar", text: "15-day forecasts you can sync to Apple or Google." },
  { icon: Sparkles, title: "Predictive Timeline", text: "See the next weather shifts before they hit." },
  { icon: Shirt, title: "Smart Outfit", text: "Faster clothing guidance for your actual conditions." },
  { icon: Map, title: "Route Sense", text: "Spot cleaner travel windows at a glance." },
  { icon: ShieldCheck, title: "AI Certainty", text: "Confidence score on every day in the forecast." },
];

function isInWindow() {
  const now = Date.now();
  return now >= WINDOW_START && now < WINDOW_END;
}

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!isInWindow()) return;
      // Local check first
      if (localStorage.getItem(STORAGE_KEY) === "1") return;

      // Don't open over the cookie consent banner — it blocks the banner's
      // clicks because Radix Dialog disables pointer events on the body.
      if (!localStorage.getItem("cookie_consent")) {
        // Re-check shortly so we open as soon as the user dismisses cookies.
        setTimeout(() => !cancelled && check(), 1500);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      if (user) {
        // Try reading profile preference if column exists; ignore errors silently
        try {
          const { data } = await supabase
            .from("profiles")
            .select("seen_whatsnew_2")
            .eq("id", user.id)
            .maybeSingle();
          if (data && (data as any).seen_whatsnew_2) {
            localStorage.setItem(STORAGE_KEY, "1");
            return;
          }
        } catch {
          // column may not exist — fall back to localStorage only
        }
      }

      // Defer opening slightly so the page can settle
      setTimeout(() => !cancelled && setOpen(true), 800);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);


  const markSeen = async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ seen_whatsnew_2: true } as any)
          .eq("id", userId);
      } catch {
        // ignore — localStorage is the source of truth fallback
      }
    }
    try {
      const amp = await import("@amplitude/unified");
      amp.track("whats_new_dismissed", { release: "rejn_2_0" });
    } catch { /* noop */ }
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      import("@amplitude/unified").then(amp => amp.track("whats_new_shown", { release: "rejn_2_0" })).catch(() => {});
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) markSeen(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-border/60">
        <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
          <button
            type="button"
            onClick={markSeen}
            aria-label="Close"
            className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <DialogHeader className="text-left">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80 font-semibold mb-2">
                  New release
                </p>
                <DialogTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                  What's New in Rejn 2.0
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground max-w-md">
                  A stronger AI layer, richer planning, and a cleaner guest-first weather flow.
                </DialogDescription>
              </div>
              <RejnMascot pose="wave" className="hidden sm:block w-20 h-20 object-contain shrink-0" />
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2 grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl"
            >
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>
            </motion.div>
          ))}
        </div>

        <div className="p-6 pt-4">
          <Button onClick={markSeen} className="w-full" size="lg">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
