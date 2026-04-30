import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import rainzLogo from "@/assets/rainz-logo-new.png";

const navLinks = [
  { label: "Intro", to: "/airport" },
  { label: "Features", to: "/airport/features" },
  { label: "Product", to: "/airport/product" },
  { label: "Contact", to: "/airport/contact" },
];

export default function AirportLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 100], ["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0)", "rgba(255,255,255,0.1)"]);

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Sticky Nav with scroll-reactive background */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl"
        style={{
          backgroundColor: navBg,
          borderBottom: useTransform(navBorder, (v) => `1px solid ${v}`),
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/airport" className="flex items-center gap-2.5 group">
            <motion.img
              src={rainzLogo}
              alt="Rainz"
              className="h-8 w-8 rounded-lg"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            />
            <span className="text-lg font-bold tracking-tight group-hover:text-blue-400 transition-colors">Rainz</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative px-4 py-2 text-sm font-medium transition-colors hover:text-white"
                >
                  <span className={isActive ? "text-white" : "text-white/50"}>
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="ml-4">
              <Link
                to="/"
                className="text-sm font-medium px-5 py-2.5 rounded-full bg-white text-black hover:bg-blue-100 transition-colors"
              >
                Open App
              </Link>
            </motion.div>
          </div>

          {/* Mobile hamburger */}
          <motion.button
            className="sm:hidden text-white/70"
            onClick={() => setMobileOpen(!mobileOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="sm:hidden overflow-hidden bg-black/95 border-b border-white/10"
            >
              <div className="px-6 py-6 flex flex-col gap-2">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={link.to}
                      className={`block text-lg font-medium py-2 ${
                        location.pathname === link.to ? "text-white" : "text-white/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link
                    to="/"
                    className="mt-2 block text-center text-sm font-medium px-4 py-3 rounded-full bg-white text-black"
                  >
                    Open App
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Page content with route transitions */}
      <main className="pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Animated footer */}
      <footer className="border-t border-white/10 py-16 px-6 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <img src={rainzLogo} alt="Rainz" className="h-6 w-6 rounded-md" />
              <span className="text-sm text-white/40">© {new Date().getFullYear()} Rainz Weather</span>
            </motion.div>
            <div className="flex gap-6 text-sm text-white/40">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <a href="mailto:hello@rainz.net" className="hover:text-white transition-colors">hello@rainz.net</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
