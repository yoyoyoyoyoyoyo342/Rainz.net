import { motion } from "framer-motion";
import { Bot, CalendarDays, Sparkles, Shirt, Map, ShieldCheck } from "lucide-react";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { RainzCard } from "@/components/rainz/rainz-card";

const features = [
  { icon: Bot, title: "AI Sky Analyst", text: "Ask Rejn anything about your local weather." },
  { icon: CalendarDays, title: "Weather Calendar", text: "15-day forecasts ready for Apple or Google planning." },
  { icon: Sparkles, title: "Predictive Timeline", text: "See the next weather shifts before they hit." },
  { icon: Shirt, title: "Smart Outfit", text: "Faster clothing guidance for your actual conditions." },
  { icon: Map, title: "Route Sense", text: "Spot cleaner travel windows at a glance." },
  { icon: ShieldCheck, title: "AI Certainty", text: "Every day now includes a confidence-style certainty score." },
];

export function WhatsNewSection() {
  const sunsetDate = new Date("2026-06-30T23:59:59");
  if (new Date() > sunsetDate) return null;

  return (
    <section className="mb-4" aria-labelledby="whats-new-rejn-2">
      <RainzCard variant="hero" glow="amber" className="border-border/60">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70 font-semibold mb-2">New in the app</p>
            <h2 id="whats-new-rejn-2" className="text-2xl sm:text-3xl font-bold text-foreground">
              What’s New in Rejn 2.0
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              A more professional weather experience with a stronger AI layer, richer planning, and a cleaner guest-first flow.
            </p>
          </div>
          <RejnMascot pose="wave" className="hidden sm:block w-20 h-20 object-contain" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="rounded-2xl border border-border/50 bg-background/30 p-4 backdrop-blur-xl"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </motion.div>
          ))}
        </div>
      </RainzCard>
    </section>
  );
}
