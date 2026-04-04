import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cloud, Zap, Users, Trophy, MapPin, Sparkles } from "lucide-react";
import carousel1 from "@/assets/carousel-1.png";
import carousel2 from "@/assets/carousel-2.png";
import carousel3 from "@/assets/carousel-3.png";
import carousel4 from "@/assets/carousel-4.png";
import carousel5 from "@/assets/carousel-5.png";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

const stats = [
  { value: "13+", label: "Weather Sources" },
  { value: "50K+", label: "Daily Predictions" },
  { value: "99.2%", label: "Uptime" },
  { value: "4.8★", label: "User Rating" },
];

const testimonials = [
  { name: "Sigrid K.", location: "Oslo", quote: "I haven't been caught in the rain since I started using Rainz. My umbrella is collecting dust.", rating: 5 },
  { name: "Erik B.", location: "Stockholm", quote: "The prediction battles are genuinely addictive. I beat my girlfriend every week and she's furious.", rating: 5 },
  { name: "Freya L.", location: "Copenhagen", quote: "DryRoutes saved my suede shoes. That alone is worth premium.", rating: 5 },
  { name: "Olav M.", location: "Bergen", quote: "In Bergen it rains 240 days a year. Rainz makes those days slightly less annoying.", rating: 4 },
];

const highlights = [
  { icon: Cloud, title: "Multi-Source Forecasts", desc: "We aggregate 13+ weather models so you don't have to." },
  { icon: Sparkles, title: "AI Weather Companion", desc: "Ask anything about the weather. Get answers that actually make sense." },
  { icon: Trophy, title: "Prediction Battles", desc: "Challenge friends. Predict the weather. Win bragging rights." },
  { icon: MapPin, title: "DryRoutes", desc: "Find the driest path to your destination. Your shoes will thank you." },
  { icon: Users, title: "Community", desc: "Leaderboards, streaks, achievements. Weather just got competitive." },
  { icon: Zap, title: "Hyper-local", desc: "Minute-by-minute rain forecasts for your exact location." },
];

export default function AirportLanding() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-black to-black" />
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 bg-gradient-to-b from-blue-400/30 to-transparent"
              style={{
                left: `${Math.random() * 100}%`,
                height: `${30 + Math.random() * 60}px`,
                top: `-${Math.random() * 20}%`,
              }}
              animate={{ y: ["0vh", "110vh"] }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "linear",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div {...fadeUp}>
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-6 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-400/5">
              Weather, reimagined
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.95] mb-6"
          >
            Made for rain.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Built for Scandinavia.
            </span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto mb-10"
          >
            The world's most unnecessarily accurate weather app.
            13 sources. AI-powered. Slightly obsessive.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all hover:scale-105"
            >
              Open Rainz <ArrowRight size={18} />
            </Link>
            <Link
              to="/airport/features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:bg-white/5 transition-all"
            >
              Explore Features
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-black text-white">{s.value}</div>
              <div className="text-sm text-white/40 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Screenshots showcase */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 {...fadeUp} className="text-3xl sm:text-4xl font-black text-center mb-4">
            Not just another weather app.
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-white/40 text-center mb-16 max-w-lg mx-auto">
            It's a weather platform with personality. Games, battles, AI, routes — all in your pocket.
          </motion.p>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {[carousel1, carousel2, carousel3, carousel4, carousel5].map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 snap-center w-60 sm:w-72"
              >
                <img
                  src={img}
                  alt={`Rainz app screenshot ${i + 1}`}
                  className="rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/5"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights grid */}
      <section className="py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp} className="text-3xl sm:text-4xl font-black text-center mb-16">
            Why Rainz?
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <h.icon size={20} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{h.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp} className="text-3xl sm:text-4xl font-black text-center mb-4">
            People seem to like it.
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-white/40 text-center mb-16">
            Real quotes. Mostly unedited. Some spelling fixed.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className={j < t.rating ? "text-yellow-400" : "text-white/10"}>★</span>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div className="text-xs text-white/30">
                  {t.name} — {t.location}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          {...fadeUp}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-black"
        >
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to never get wet again?</h2>
          <p className="text-white/40 mb-8">It's free. It's fast. It's probably raining right now.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all hover:scale-105"
          >
            Open Rainz <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
