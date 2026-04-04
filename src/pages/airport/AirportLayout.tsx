import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
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

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/airport" className="flex items-center gap-2">
            <img src={rainzLogo} alt="Rainz" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Rainz</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  location.pathname === link.to ? "text-white" : "text-white/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/"
              className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 transition-colors"
            >
              Open App
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden text-white/70"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sm:hidden px-6 pb-6 flex flex-col gap-4 bg-black/95 border-b border-white/10"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium ${
                  location.pathname === link.to ? "text-white" : "text-white/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black text-center"
            >
              Open App
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Page content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={rainzLogo} alt="Rainz" className="h-6 w-6 rounded-md" />
            <span className="text-sm text-white/40">© {new Date().getFullYear()} Rainz Weather</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Link to="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
            <a href="mailto:hello@rainz.net" className="hover:text-white/70 transition-colors">hello@rainz.net</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
