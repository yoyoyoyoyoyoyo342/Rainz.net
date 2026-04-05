import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Cloud, Brain, Swords, MapPin, Flower2, Wind,
  Gamepad2, BarChart3, Bell, Thermometer, Moon, Eye, ArrowRight
} from "lucide-react";
import { useRef } from "react";

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
  Core: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  Premium: "bg-purple-500/20 text-purple-300 border-purple-500/20",
  Social: "bg-green-500/20 text-green-300 border-green-500/20",
  Health: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
  Fun: "bg-yellow-500/20 text-yellow-300 border-yellow-500/20",
  Advanced: "bg-orange-500/20 text-orange-300 border-orange-500/20",
};

const tagGlows: Record<string, string> = {
  Core: "group-hover:shadow-blue-500/10",
  Premium: "group-hover:shadow-purple-500/10",
  Social: "group-hover:shadow-green-500/10",
  Health: "group-hover:shadow-emerald-500/10",
  Fun: "group-hover:shadow-yellow-500/10",
  Advanced: "group-hover:shadow-orange-500/10",
};

/* ── Tilt card ── */
function FeatureTiltCard({ children, className, glowClass }: { children: React.ReactNode; className?: string; glowClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={`${className} ${glowClass} group-hover:shadow-2xl transition-shadow`}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function AirportFeatures() {
  return (
    <div className="overflow-hidden">
      {/* Hero with animated background */}
      <section className="py-32 px-6 text-center relative">
        {/* Animated grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-8 px-5 py-2.5 rounded-full border border-blue-400/20 bg-blue-400/5">
              Features
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl font-black tracking-tighter mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Absurdly
            <br />
            <motion.span
              className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200% 200%" }}
            >
              feature-rich.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 max-w-lg mx-auto text-lg"
          >
            We built everything you'd want in a weather app. Then we kept going.
          </motion.p>
        </div>
      </section>

      {/* Feature count strip */}
      <div className="flex justify-center gap-8 py-8 border-y border-white/5">
        {[
          { n: "12", label: "Features" },
          { n: "6", label: "Categories" },
          { n: "∞", label: "Obsession" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="text-2xl font-black text-white">{s.n}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Feature grid with tilt cards */}
      <section className="px-6 py-24">
        <motion.div
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className="group">
              <FeatureTiltCard
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:border-white/20 h-full"
                glowClass={tagGlows[f.tag]}
              >
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors"
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <f.icon size={20} className="text-blue-400" />
                  </motion.div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${tagColors[f.tag] || "bg-white/10 text-white/50 border-white/10"}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </FeatureTiltCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 sm:p-16 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-black relative overflow-hidden"
        >
          <motion.div
            className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-[80px]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Convinced yet?</h2>
            <p className="text-white/40 mb-8">See the product or just go ahead and try it.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/airport/product"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
                >
                  See Product <ArrowRight size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 transition-colors"
                >
                  Open App
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
