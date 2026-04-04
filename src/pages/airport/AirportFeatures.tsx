import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Cloud, Brain, Swords, MapPin, Flower2, Wind,
  Gamepad2, BarChart3, Bell, Thermometer, Moon, Eye, ArrowRight
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

const features = [
  {
    icon: Cloud,
    title: "Multi-Source Forecasts",
    desc: "We pull data from ECMWF, GFS, DWD ICON, SMHI, MET Norway, and 8 more models. Then we blend them so you get the most accurate forecast possible. Overkill? Maybe. Accurate? Extremely.",
    tag: "Core",
  },
  {
    icon: Brain,
    title: "AI Weather Companion",
    desc: "Ask 'Should I bring an umbrella?' or 'Will my BBQ get ruined Saturday?' and get a real, context-aware answer. Powered by LLMs trained on meteorological data.",
    tag: "Premium",
  },
  {
    icon: Swords,
    title: "Prediction Battles",
    desc: "Challenge friends to predict tomorrow's weather. Closest to actual wins. Leaderboards, leagues, and bragging rights included. Weather just became a competitive sport.",
    tag: "Social",
  },
  {
    icon: MapPin,
    title: "DryRoutes Navigation",
    desc: "Find the driest path between two points. Minute-by-minute precipitation overlayed on real routes. Your suede shoes will thank you.",
    tag: "Premium",
  },
  {
    icon: Flower2,
    title: "Pollen & Allergy Tracking",
    desc: "Track birch, grass, and ragweed levels. Set up personal allergy profiles and get alerts before pollen counts spike. Sneeze prevention as a service.",
    tag: "Health",
  },
  {
    icon: Wind,
    title: "Air Quality Index",
    desc: "Real-time AQI monitoring with health recommendations. Know when to run outdoors and when to stay in and watch Netflix.",
    tag: "Health",
  },
  {
    icon: Gamepad2,
    title: "Weather Games",
    desc: "Rain Dodge, Cloud Jump, Snow Skiing, Wind Surfer — six mini-games that change based on current weather conditions. Procrastination, elevated.",
    tag: "Fun",
  },
  {
    icon: BarChart3,
    title: "Forecast Confidence",
    desc: "See how confident each model is. Ensemble spreads, probability cones, and uncertainty bands — for the weather nerds among us.",
    tag: "Advanced",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Get alerted before it rains, when pollen spikes, or when severe weather is incoming. Customizable, not spammy.",
    tag: "Core",
  },
  {
    icon: Thermometer,
    title: "Hyper-Local Data",
    desc: "Minute-by-minute rain forecasts for your exact GPS position. Not your city. Not your neighborhood. Your position.",
    tag: "Core",
  },
  {
    icon: Moon,
    title: "Moon & Astronomy",
    desc: "Moon phases, rise/set times, and AI-powered moon insights. Perfect for fishing, photography, or just being moody.",
    tag: "Fun",
  },
  {
    icon: Eye,
    title: "Weather Déjà Vu",
    desc: "See what the weather was like on this exact day in previous years. Great for planning, nostalgia, or proving your memory right.",
    tag: "Fun",
  },
];

const tagColors: Record<string, string> = {
  Core: "bg-blue-500/20 text-blue-300",
  Premium: "bg-purple-500/20 text-purple-300",
  Social: "bg-green-500/20 text-green-300",
  Health: "bg-emerald-500/20 text-emerald-300",
  Fun: "bg-yellow-500/20 text-yellow-300",
  Advanced: "bg-orange-500/20 text-orange-300",
};

export default function AirportFeatures() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-32 px-6 text-center">
        <motion.span
          {...fadeUp}
          className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-6 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-400/5"
        >
          Features
        </motion.span>
        <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl font-black tracking-tight mb-6">
          Absurdly feature-rich.
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-white/40 max-w-lg mx-auto text-lg">
          We built everything you'd want in a weather app. Then we kept going.
        </motion.p>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <f.icon size={20} className="text-blue-400" />
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full ${tagColors[f.tag] || "bg-white/10 text-white/50"}`}>
                  {f.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          {...fadeUp}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-black"
        >
          <h2 className="text-3xl font-black mb-4">Convinced yet?</h2>
          <p className="text-white/40 mb-8">Check out the plans or just go ahead and try it.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/airport/product"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all hover:scale-105"
            >
              See Plans <ArrowRight size={18} />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:bg-white/5 transition-all"
            >
              Open App
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
