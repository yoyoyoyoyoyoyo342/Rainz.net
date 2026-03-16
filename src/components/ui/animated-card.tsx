import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedCard({ children, index = 0, className }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: if IntersectionObserver doesn't fire within 1s, show anyway
    const fallbackTimer = setTimeout(() => setIsVisible(true), 800 + index * 75);

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Delay based on index for stagger effect
          setTimeout(() => setIsVisible(true), index * 75);
          observer.unobserve(el);
        }
      },
      { threshold: 0.01, rootMargin: "100px" }
    );

    observer.observe(el);
    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [index]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className
      )}
    >
      {children}
    </div>
  );
}
