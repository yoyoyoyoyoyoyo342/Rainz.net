import { motion } from "framer-motion";
import React from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}
