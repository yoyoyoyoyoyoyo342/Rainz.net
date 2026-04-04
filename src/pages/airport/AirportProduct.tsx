import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, X, ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

const plans = [
  {
    name: "Rainz Free",
    price: "0",
    period: "forever",
    desc: "Everything you need to stay dry.",
    features: [
      "Multi-source weather forecasts",
      "Hourly & 10-day forecasts",
      "Weather predictions & leaderboard",
      "Weather games (limited)",
      "Community features",
      "Basic notifications",
    ],
    missing: [
      "AI Weather Companion",
      "DryRoutes navigation",
      "Pollen & AQI tracking",
      "Advanced maps",
      "Ad-free experience",
    ],
    cta: "Get Started",
    to: "/auth",
    highlight: false,
  },
  {
    name: "Rainz Premium",
    price: "29",
    period: "kr / month",
    desc: "For people who take weather personally.",
    features: [
      "Everything in Free",
      "AI Weather Companion",
      "DryRoutes navigation",
      "Pollen & AQI tracking",
      "Advanced interactive maps",
      "Unlimited weather games",
      "Forecast confidence data",
      "Priority notifications",
      "Ad-free experience",
      "Exclusive achievements",
    ],
    missing: [],
    cta: "Go Premium",
    to: "/auth",
    highlight: true,
  },
  {
    name: "Rainz API",
    price: "Custom",
    period: "contact us",
    desc: "Build with our weather data.",
    features: [
      "RESTful weather API",
      "MCP integration",
      "Multi-source aggregated data",
      "Historical weather data",
      "Webhook notifications",
      "Developer dashboard",
      "99.9% SLA",
    ],
    missing: [],
    cta: "Contact Sales",
    to: "/airport/contact",
    highlight: false,
  },
];

const comparison = [
  { feature: "Weather sources", free: "13+", premium: "13+", api: "13+" },
  { feature: "Forecast accuracy", free: "High", premium: "Highest", api: "Highest" },
  { feature: "AI Companion", free: "—", premium: "✓", api: "—" },
  { feature: "DryRoutes", free: "—", premium: "✓", api: "—" },
  { feature: "Pollen tracking", free: "—", premium: "✓", api: "✓" },
  { feature: "Games", free: "3/day", premium: "Unlimited", api: "—" },
  { feature: "Predictions", free: "✓", premium: "✓", api: "✓" },
  { feature: "Ads", free: "Yes", premium: "None", api: "None" },
  { feature: "API access", free: "—", premium: "—", api: "✓" },
  { feature: "Support", free: "Community", premium: "Priority", api: "Dedicated" },
];

export default function AirportProduct() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-32 px-6 text-center">
        <motion.span
          {...fadeUp}
          className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-6 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-400/5"
        >
          Pricing
        </motion.span>
        <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl font-black tracking-tight mb-6">
          Simple plans.
          <br />
          <span className="text-white/40">No surprises.</span>
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-white/40 max-w-lg mx-auto text-lg">
          Start free. Upgrade when your weather obsession inevitably grows.
        </motion.p>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative p-8 rounded-2xl border ${
                plan.highlight
                  ? "border-blue-500/40 bg-gradient-to-b from-blue-950/20 to-white/[0.03]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500 text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-white/40 mb-6">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-black">
                  {plan.price === "Custom" ? "" : ""}
                  {plan.price}
                </span>
                {plan.price !== "Custom" && <span className="text-sm text-white/30 ml-1">{plan.period}</span>}
                {plan.price === "Custom" && <span className="text-sm text-white/30 ml-2">{plan.period}</span>}
              </div>

              <Link
                to={plan.to}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm transition-all mb-8 ${
                  plan.highlight
                    ? "bg-white text-black hover:bg-white/90"
                    : "border border-white/20 text-white/80 hover:bg-white/5"
                }`}
              >
                {plan.cta} <ArrowRight size={16} />
              </Link>

              <div className="space-y-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/60">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <X size={16} className="text-white/20 mt-0.5 flex-shrink-0" />
                    <span className="text-white/25">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeUp} className="text-2xl font-black text-center mb-12">
            Compare plans
          </motion.h2>
          <motion.div {...fadeUp} className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="text-left py-4 px-6 font-medium text-white/50">Feature</th>
                  <th className="text-center py-4 px-4 font-medium text-white/50">Free</th>
                  <th className="text-center py-4 px-4 font-medium text-blue-400">Premium</th>
                  <th className="text-center py-4 px-4 font-medium text-white/50">API</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={i < comparison.length - 1 ? "border-b border-white/5" : ""}>
                    <td className="py-3 px-6 text-white/60">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-white/40">{row.free}</td>
                    <td className="py-3 px-4 text-center text-white/70">{row.premium}</td>
                    <td className="py-3 px-4 text-center text-white/40">{row.api}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
