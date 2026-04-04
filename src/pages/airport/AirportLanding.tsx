import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cloud, Zap, Users, Trophy, MapPin, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useEffect, useState, useMemo } from "react";
import carousel1 from "@/assets/carousel-1.png";
import carousel2 from "@/assets/carousel-2.png";
import carousel3 from "@/assets/carousel-3.png";
import carousel4 from "@/assets/carousel-4.png";
import carousel5 from "@/assets/carousel-5.png";

/* ── Animated counter ── */
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

function formatStatAnimated(n: number) {
  if (n >= 1_000_000) return { num: Math.round(n / 100_000) / 10, suffix: "M" };
  if (n >= 1_000) return { num: Math.round(n / 100) / 10, suffix: "K" };
  return { num: n, suffix: "" };
}

/* ── Marquee strip ── */
function MarqueeStrip() {
  const items = [
    "ECMWF", "GFS", "ICON", "SMHI", "MET Norway", "Open-Meteo", "Tomorrow.io",
    "WeatherAPI", "Visual Crossing", "Pirate Weather", "AI-Powered", "13+ Sources",
    "Hyper-Local", "Minute-by-Minute", "Scandinavia First",
  ];
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden py-6 border-y border-white/5">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="text-sm font-mono uppercase tracking-widest text-white/15 flex-shrink-0">
            {item}
            <span className="ml-8 text-white/10">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Floating orbs background ── */
function FloatingOrbs() {
  const orbs = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: 200 + Math.random() * 400,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 15 + Math.random() * 20,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Live stats hook ── */
function useLiveStats() {
  return useQuery({
    queryKey: ["airport-live-stats"],
    queryFn: async () => {
      const [usersRes, predictionsRes, streaksRes, battlesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("weather_predictions").select("id", { count: "exact", head: true }),
        supabase.from("user_streaks").select("id", { count: "exact", head: true }),
        supabase.from("prediction_battles").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalUsers: usersRes.count ?? 0,
        totalPredictions: predictionsRes.count ?? 0,
        activeForecasters: streaksRes.count ?? 0,
        totalBattles: battlesRes.count ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/* ── Tilt card on hover ── */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

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

/* ── Stagger container ── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function AirportLanding() {
  const { data: stats } = useLiveStats();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  const screenshotRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: screenshotProgress } = useScroll({ target: screenshotRef, offset: ["start end", "end start"] });
  const screenshotX = useTransform(screenshotProgress, [0, 1], [100, -100]);

  const statItems = [
    { value: 3000, label: "Users", suffix: "+" },
    { value: 600, label: "Predictions", suffix: "+" },
    { value: 13, label: "Weather Sources", suffix: "+" },
    { value: 250, label: "Battles", suffix: "+" },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero with parallax */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6">
        <FloatingOrbs />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-black/80 to-black" />

        {/* Rain particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px bg-gradient-to-b from-blue-400/40 to-transparent"
              style={{
                left: `${(i / 50) * 100}%`,
                height: `${20 + Math.random() * 80}px`,
              }}
              animate={{ y: ["-10vh", "110vh"] }}
              transition={{
                duration: 1.5 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "linear",
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative z-10 text-center max-w-4xl mx-auto"
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        >
          {/* Badge with pulse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="relative inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-8 px-5 py-2.5 rounded-full border border-blue-400/20 bg-blue-400/5">
              <motion.span
                className="absolute inset-0 rounded-full border border-blue-400/30"
                animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              Weather, reimagined
            </span>
          </motion.div>

          {/* Hero text with word-by-word reveal */}
          <motion.h1 className="text-5xl sm:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            {"Made for rain.".split(" ").map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 40, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: "easeOut" }}
              >
                {word}
              </motion.span>
            ))}
            <br />
            {"Built for Scandinavia.".split(" ").map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em] bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-[length:200%] bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 40, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.1, ease: "easeOut" }}
                style={{ backgroundPosition: `${i * 30}% 0` }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto mb-12"
          >
            The world's most unnecessarily accurate weather app.
            <br className="hidden sm:block" />
            13 sources. AI-powered. Slightly obsessive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-white text-black font-semibold shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] transition-shadow"
              >
                Open Rainz <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/airport/features"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full border border-white/20 text-white/80 font-semibold hover:border-white/40 transition-colors"
              >
                Explore Features
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">Scroll</span>
          <motion.div
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
            animate={{ borderColor: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.2)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1 h-1.5 rounded-full bg-white/60"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee */}
      <MarqueeStrip />

      {/* Live Stats with animated counters */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 mb-10"
          >
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 align-middle"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Live from Rainz.net
          </motion.p>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {statItems.map((s) => (
              <motion.div key={s.label} variants={staggerItem} className="text-center">
                <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                  <AnimatedCounter value={s.value} />
                  {s.suffix}
                </div>
                <div className="text-sm text-white/40 mt-2">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Screenshots with horizontal parallax */}
      <section ref={screenshotRef} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-black text-center mb-4"
          >
            Not just another weather app.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/40 text-center mb-16 max-w-lg mx-auto"
          >
            It's a weather platform with personality. Games, battles, AI, routes — all in your pocket.
          </motion.p>

          <motion.div
            className="flex gap-6 pb-4"
            style={{ x: screenshotX }}
          >
            {[carousel1, carousel2, carousel3, carousel4, carousel5].map((img, i) => (
              <motion.div
                key={i}
                className="flex-shrink-0 w-60 sm:w-72"
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={img}
                  alt={`Rainz app screenshot ${i + 1}`}
                  className="rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Highlights with tilt cards */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950/50 to-black" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-black text-center mb-16"
          >
            Why Rainz?
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {highlights.map((h) => (
              <motion.div key={h.title} variants={staggerItem}>
                <TiltCard className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/20 transition-all group h-full cursor-default">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <h.icon size={22} className="text-blue-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">{h.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{h.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials with staggered entrance */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-black text-center mb-4"
          >
            People seem to like it.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/40 text-center mb-16"
          >
            Real quotes. Mostly unedited. Some spelling fixed.
          </motion.p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={staggerItem}
                whileHover={{ scale: 1.02, y: -4 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-colors"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <motion.span
                      key={j}
                      className={j < t.rating ? "text-yellow-400" : "text-white/10"}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: j * 0.05 }}
                    >
                      ★
                    </motion.span>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div className="text-xs text-white/30 font-medium">
                  {t.name} — {t.location}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA with glow */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 sm:p-16 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 to-black relative overflow-hidden"
        >
          {/* Animated glow */}
          <motion.div
            className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-[80px]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/15 rounded-full blur-[80px]"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black mb-6">Ready to never get wet again?</h2>
            <p className="text-white/40 mb-10 text-lg">It's free. It's fast. It's probably raining right now.</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:shadow-[0_0_80px_rgba(255,255,255,0.3)] transition-shadow"
              >
                Open Rainz <ArrowRight size={20} />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
