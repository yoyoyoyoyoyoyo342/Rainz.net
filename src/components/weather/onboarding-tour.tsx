import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Target, Navigation, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "rainz-tour-complete";

const steps = [
  {
    icon: Target,
    title: "Predict Tomorrow's Weather",
    description: "Make daily predictions, earn points, and climb the leaderboard. Challenge friends to prediction battles!",
    color: "text-primary",
    bg: "from-primary/20 to-primary/5",
  },
  {
    icon: Navigation,
    title: "Plan Dry Walking Routes",
    description: "DryRoutes finds rain-free paths so you stay dry on your commute. Tap the map icon to try it!",
    color: "text-emerald-500",
    bg: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Users,
    title: "Join the Community",
    description: "Post weather reactions, share photos, and see what others near you are experiencing in real time.",
    color: "text-violet-500",
    bg: "from-violet-500/20 to-violet-500/5",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY) !== "true") {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            onClick={dismiss}
          />
          {/* Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-4 right-4 z-[9999] mx-auto max-w-sm rounded-2xl border border-border bg-background/95 backdrop-blur-xl p-5 shadow-2xl"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 rounded-full p-1 hover:bg-muted/50 transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${current.bg} mb-3`}>
              <Icon className={`w-6 h-6 ${current.color}`} />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{current.description}</p>

            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs">
                  Skip
                </Button>
                <Button size="sm" onClick={next} className="text-xs">
                  {step < steps.length - 1 ? "Next" : "Get Started"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
