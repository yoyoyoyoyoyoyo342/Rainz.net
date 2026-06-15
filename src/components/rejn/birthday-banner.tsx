import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Gift, PartyPopper, Sparkles, X } from "lucide-react";
import { useBirthdayMode } from "@/hooks/use-birthday-mode";
import { BIRTHDAY_LOGO } from "@/lib/birthday-mode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BirthdayMinigames } from "@/components/rejn/birthday-minigames";

const DISMISS_KEY = "rejn-birthday-banner-dismissed-v1";

export function BirthdayBanner() {
  const { active, isBirthday, daysLeft, age } = useBirthdayMode();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [arcadeOpen, setArcadeOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return;
    try {
      const { year } = JSON.parse(raw);
      // Only honour dismissal for the current birthday year
      if (year === new Date().getFullYear()) setDismissed(true);
    } catch {}
  }, []);

  // Confetti-ish sparkle burst on the actual birthday day, once per session
  useEffect(() => {
    if (!active || !isBirthday) return;
    const k = `rejn-birthday-burst-${new Date().toDateString()}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    setOpen(true);
  }, [active, isBirthday]);

  const sparkles = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2 + Math.random() * 2,
    })),
    [],
  );

  if (!active || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ year: new Date().getFullYear() }),
    );
  };

  const headline = isBirthday
    ? `🎉 It's Rejn's ${age === 1 ? "1st" : `${age}th`} birthday!`
    : `🎂 Rejn's birthday month — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="relative z-40 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #b8860b 0%, #f1c40f 35%, #fff3a0 50%, #f1c40f 65%, #b8860b 100%)",
            backgroundSize: "200% 200%",
          }}
        >
          {/* Animated shimmer */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          {/* Sparkles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {sparkles.map((s) => (
              <motion.span
                key={s.id}
                className="absolute top-0 text-white/80"
                style={{ left: `${s.left}%` }}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 40, opacity: [0, 1, 0] }}
                transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
              >
                ✦
              </motion.span>
            ))}
          </div>

          <div className="relative flex items-center justify-between gap-3 px-4 py-2 text-[13px] sm:text-sm font-semibold text-amber-950">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 min-w-0 flex-1 text-left"
            >
              <img
                src={BIRTHDAY_LOGO}
                alt="Rejn golden birthday logo"
                className="h-6 w-6 rounded-md shadow-md ring-1 ring-amber-900/30"
              />
              <span className="truncate">
                {headline} <span className="hidden sm:inline opacity-80">· Tap for golden perks</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss birthday banner"
              onClick={dismiss}
              className="shrink-0 p-1 rounded-full hover:bg-amber-900/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md birthday-dialog">
          <DialogHeader className="items-center text-center">
            <motion.img
              src={BIRTHDAY_LOGO}
              alt="Rejn golden birthday logo"
              className="h-20 w-20 rounded-2xl shadow-2xl ring-2 ring-amber-400/60"
              initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
            />
            <DialogTitle className="mt-3 text-2xl flex items-center gap-2 justify-center">
              <PartyPopper className="h-5 w-5 text-amber-500" />
              Happy Birthday, Rejn!
              <PartyPopper className="h-5 w-5 text-amber-500" />
            </DialogTitle>
            <DialogDescription className="text-base">
              {isBirthday
                ? `Today — Aug 8 — Rejn turns ${age}. Thanks for forecasting with us.`
                : `Aug 8 → Sep 8 is Rejn's birthday month (turning ${age}).`}
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-2 space-y-3 text-sm">
            <li className="flex gap-3 items-start">
              <Sparkles className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span><b>2× prediction points</b> on every forecast you submit this month.</span>
            </li>
            <li className="flex gap-3 items-start">
              <Gift className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span><b>Free Golden Streak Freeze</b> — claim once from your profile.</span>
            </li>
            <li className="flex gap-3 items-start">
              <PartyPopper className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span><b>Golden leaderboard badge</b> for anyone who predicts on Aug 8.</span>
            </li>
            <li className="flex gap-3 items-start">
              <Sparkles className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span>App-wide <b>golden theme</b> + collectible <b>birthday logo</b>.</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            All perks active Aug 8 – Sep 8. From everyone at Rejn — tusen takk. 💛
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
