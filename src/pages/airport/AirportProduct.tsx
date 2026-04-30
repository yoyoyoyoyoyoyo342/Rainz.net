import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Cloud, Brain, Swords, MapPin, Flower2,
  Gamepad2, BarChart3, Bell, Thermometer, Moon, Globe,
  Smartphone, Zap, Shield, Users
} from "lucide-react";
import { useRef } from "react";
import carousel1 from "@/assets/carousel-1.png";
import carousel2 from "@/assets/carousel-2.png";
import carousel3 from "@/assets/carousel-3.png";
import carousel4 from "@/assets/carousel-4.png";
import carousel5 from "@/assets/carousel-5.png";

const coreFeatures = [
  { icon: Cloud, title: "13+ Weather Sources", desc: "ECMWF, GFS, DWD ICON, SMHI, MET Norway and more — blended into one hyper-accurate forecast." },
  { icon: Brain, title: "AI Weather Companion", desc: "Ask natural-language weather questions and get context-aware answers powered by LLMs." },
  { icon: Swords, title: "Prediction Battles", desc: "Compete with friends to predict tomorrow's weather. Leaderboards, leagues, and bragging rights." },
  { icon: MapPin, title: "DryRoutes", desc: "Minute-by-minute precipitation overlayed on real walking routes. Stay dry, door to door." },
  { icon: Flower2, title: "Pollen & Air Quality", desc: "Personal allergy profiles, pollen alerts, and real-time AQI monitoring." },
  { icon: Gamepad2, title: "Weather Games", desc: "Six weather-themed mini-games that change based on current conditions." },
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

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
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
      className={className}
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
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
};

export default function AirportProduct() {
  const showcaseRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: showcaseRef, offset: ["start end", "end start"] });
  const showcaseScale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
  const showcaseOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-32 px-6 text-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[150px]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-8 px-5 py-2.5 rounded-full border border-blue-400/20 bg-blue-400/5">
              The Product
            </span>
          </motion.div>
          <motion.h1
            className="text-5xl sm:text-7xl font-black tracking-tighter mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Weather
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">done right.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 max-w-xl mx-auto text-lg"
          >
            Rainz is a free weather platform built for Scandinavia — combining multi-source forecasting, AI, gamification, and community into one app.
          </motion.p>
        </div>
      </section>

      {/* App showcase with scroll-driven scale */}
      <section ref={showcaseRef} className="px-6 pb-24">
        <motion.div
          className="max-w-5xl mx-auto"
          style={{ scale: showcaseScale, opacity: showcaseOpacity }}
        >
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide justify-center">
            {screenshots.map((s, i) => (
              <motion.div
                key={i}
                className="flex-shrink-0 snap-center w-52 sm:w-60"
                whileHover={{ scale: 1.08, y: -12 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative group">
                  <img
                    src={s.img}
                    alt={s.label}
                    className="rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10 transition-shadow group-hover:shadow-blue-500/20"
                  />
                  {/* Label overlay on hover */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl py-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <p className="text-xs text-white/80 text-center font-medium">{s.label}</p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Core features with tilt */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/50 to-black" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-black text-center mb-4"
          >
            What's inside
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/40 text-center mb-16 max-w-lg mx-auto"
          >
            Every feature you need to understand, predict, and enjoy the weather.
          </motion.p>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {coreFeatures.map((f) => (
              <motion.div key={f.title} variants={fadeItem} className="group">
                <TiltCard className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all h-full">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <f.icon size={22} className="text-blue-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tech specs with staggered horizontal entrance */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-black text-center mb-12"
          >
            Under the hood
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {techSpecs.map((spec) => (
              <motion.div
                key={spec.label}
                variants={{
                  hidden: { opacity: 0, x: -30 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
                }}
                whileHover={{ scale: 1.03, x: 4 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-default"
              >
                <spec.icon size={18} className="text-blue-400/60 flex-shrink-0" />
                <span className="text-sm text-white/60">{spec.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
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
            className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/15 rounded-full blur-[80px]"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Completely free. No catch.</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">
              Rainz is free to use. No subscriptions, no paywalls. Just weather, done properly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
                >
                  Open Rainz <ArrowRight size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/download"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 transition-colors"
                >
                  Download App
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
