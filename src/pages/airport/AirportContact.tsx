import { motion } from "framer-motion";
import { Mail, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

export default function AirportContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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
      <section className="py-32 px-6 text-center">
        <motion.span
          {...fadeUp}
          className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-blue-400/80 mb-6 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-400/5"
        >
          Contact
        </motion.span>
        <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl font-black tracking-tight mb-6">
          Say hello.
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-white/40 max-w-lg mx-auto text-lg">
          Questions, feedback, partnership ideas, or just want to chat about the weather. We're here.
        </motion.p>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <motion.div {...fadeUp} className="space-y-8">
            <div>
              <h2 className="text-2xl font-black mb-6">Get in touch</h2>
              <p className="text-white/40 leading-relaxed">
                Whether you're a user with feedback, a developer wanting API access, or a business exploring partnerships — we'd love to hear from you.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <a
                    href="mailto:hello@rainz.net"
                    className="text-white/50 hover:text-blue-400 transition-colors"
                  >
                    hello@rainz.net
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Location</h3>
                  <p className="text-white/50">Somewhere in Scandinavia, under a cloud ☁️</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="font-semibold mb-2">Response time</h3>
              <p className="text-sm text-white/40">
                We typically respond within 24 hours. If it's raining particularly hard, maybe 48.
              </p>
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {sending ? "Sending..." : "Send Message"} <Send size={16} />
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
