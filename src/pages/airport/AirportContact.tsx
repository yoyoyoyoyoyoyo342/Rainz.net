import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Mail, MapPin, Send, ArrowUpRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ── Floating particles ── */
function ContactParticles() {
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/20"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ y: [0, -30, 0], x: [0, 15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Magnetic button ── */
function MagneticButton({ children, className, disabled, type, onClick }: { children: React.ReactNode; className?: string; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const fadeItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AirportContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSending(true);
    try {
      await supabase.functions.invoke("send-feedback", {
        body: { name, email, message, source: "airport-contact" },
      });
      toast.success("Message sent! We'll get back to you soon.");
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Failed to send. Try emailing us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-32 px-6 text-center relative">
        <ContactParticles />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-8 px-5 py-2.5 rounded-full border border-blue-400/20 bg-blue-400/5">
              Contact
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl font-black tracking-tighter mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Say
            <motion.span
              className="inline-block ml-3"
              animate={{ rotate: [0, 14, -8, 14, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              👋
            </motion.span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 max-w-lg mx-auto text-lg"
          >
            Questions, feedback, partnership ideas, or just want to chat about the weather. We're here.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.div variants={fadeItem}>
              <h2 className="text-2xl font-black mb-6">Get in touch</h2>
              <p className="text-white/40 leading-relaxed">
                Whether you're a user with feedback, a developer wanting API access, or a business exploring partnerships — we'd love to hear from you.
              </p>
            </motion.div>

            <motion.div variants={fadeItem} className="space-y-4">
              <motion.a
                href="mailto:hello@rainz.net"
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all group"
                whileHover={{ x: 4 }}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Mail size={20} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Email</h3>
                  <p className="text-white/50 text-sm">hello@rainz.net</p>
                </div>
                <ArrowUpRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </motion.a>

              <motion.div
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03]"
                whileHover={{ x: 4 }}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Location</h3>
                  <p className="text-white/50 text-sm">Somewhere in Scandinavia, under a cloud ☁️</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              variants={fadeItem}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] relative overflow-hidden"
            >
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[60px]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <h3 className="font-semibold mb-2 relative z-10">Response time</h3>
              <p className="text-sm text-white/40 relative z-10">
                We typically respond within 24 hours. If it's raining particularly hard, maybe 48.
              </p>
            </motion.div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <motion.div
                  className="text-6xl mb-6"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  ✉️
                </motion.div>
                <h3 className="text-xl font-bold mb-2">Message sent!</h3>
                <p className="text-white/40 text-sm mb-6">We'll get back to you faster than a cold front moves through Bergen.</p>
                <button
                  onClick={() => setSent(false)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  { label: "Name", type: "text", value: name, setter: setName, placeholder: "Your name" },
                  { label: "Email", type: "email", value: email, setter: setEmail, placeholder: "your@email.com" },
                ].map((field, i) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <label className="block text-sm font-medium text-white/60 mb-2">{field.label}</label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all focus:bg-white/[0.08]"
                    />
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-medium text-white/60 mb-2">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={5}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none focus:bg-white/[0.08]"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                >
                  <MagneticButton
                    type="submit"
                    disabled={sending}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-white text-black font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                  >
                    {sending ? (
                      <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        Sending...
                      </motion.span>
                    ) : (
                      <>Send Message <Send size={16} /></>
                    )}
                  </MagneticButton>
                </motion.div>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
