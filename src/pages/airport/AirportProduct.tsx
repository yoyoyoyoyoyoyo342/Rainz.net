import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Cloud, Brain, Swords, MapPin, Flower2,
  Gamepad2, BarChart3, Bell, Thermometer, Moon, Globe,
  Smartphone, Zap, Shield, Users
} from "lucide-react";
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

const coreFeatures = [
  {
    icon: Cloud,
    title: "13+ Weather Sources",
    desc: "ECMWF, GFS, DWD ICON, SMHI, MET Norway and more — blended into one hyper-accurate forecast.",
  },
  {
    icon: Brain,
    title: "AI Weather Companion",
    desc: "Ask natural-language weather questions and get context-aware answers powered by LLMs.",
  },
  {
    icon: Swords,
    title: "Prediction Battles",
    desc: "Compete with friends to predict tomorrow's weather. Leaderboards, leagues, and bragging rights.",
  },
  {
    icon: MapPin,
    title: "DryRoutes",
    desc: "Minute-by-minute precipitation overlayed on real walking routes. Stay dry, door to door.",
  },
  {
    icon: Flower2,
    title: "Pollen & Air Quality",
    desc: "Personal allergy profiles, pollen alerts, and real-time AQI monitoring.",
  },
  {
    icon: Gamepad2,
    title: "Weather Games",
    desc: "Six weather-themed mini-games that change based on current conditions.",
  },
];

const techSpecs = [
  { icon: Thermometer, label: "Minute-by-minute rain forecasts" },
  { icon: BarChart3, label: "Ensemble forecast confidence" },
  { icon: Moon, label: "Moon phases & astronomy" },
  { icon: Bell, label: "Smart weather notifications" },
  { icon: Globe, label: "Global coverage, local precision" },
  { icon: Smartphone, label: "PWA — works on any device" },
  { icon: Zap, label: "Real-time data updates" },
  { icon: Shield, label: "Privacy-first, no tracking ads" },
  { icon: Users, label: "Social leaderboards & streaks" },
];

const screenshots = [
  { img: carousel1, label: "Current weather" },
  { img: carousel2, label: "Forecasts" },
  { img: carousel3, label: "Predictions" },
  { img: carousel4, label: "Games" },
  { img: carousel5, label: "Community" },
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
          The Product
        </motion.span>
        <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl font-black tracking-tight mb-6">
          Weather done right.
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-white/40 max-w-xl mx-auto text-lg">
          Rainz is a free weather platform built for Scandinavia — combining multi-source forecasting, AI, gamification, and community into one app.
        </motion.p>
      </section>

      {/* App showcase */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide justify-center">
            {screenshots.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex-shrink-0 snap-center w-52 sm:w-60"
              >
                <img
                  src={s.img}
                  alt={s.label}
                  className="rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/5 mb-3"
                />
                <p className="text-xs text-white/30 text-center font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core features */}
      <section className="py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp} className="text-3xl sm:text-4xl font-black text-center mb-4">
            What's inside
          </motion.h2>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="text-white/40 text-center mb-16 max-w-lg mx-auto">
            Every feature you need to understand, predict, and enjoy the weather.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <f.icon size={20} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech specs strip */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeUp} className="text-2xl font-black text-center mb-12">
            Under the hood
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {techSpecs.map((spec, i) => (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <spec.icon size={18} className="text-blue-400/60 flex-shrink-0" />
                <span className="text-sm text-white/60">{spec.label}</span>
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
          <h2 className="text-3xl font-black mb-4">Completely free. No catch.</h2>
          <p className="text-white/40 mb-8 max-w-md mx-auto">
            Rainz is free to use. No subscriptions, no paywalls, no "premium tiers." Just weather, done properly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all hover:scale-105"
            >
              Open Rainz <ArrowRight size={18} />
            </Link>
            <Link
              to="/download"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:bg-white/5 transition-all"
            >
              Download App
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
