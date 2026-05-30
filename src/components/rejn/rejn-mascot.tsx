import { motion } from "framer-motion";
import rejnWave from "@/assets/rejn-wave.png";
import rejnDance from "@/assets/rejn-dance.png";
import rejnSleep from "@/assets/rejn-sleep.png";
import rejnSit from "@/assets/rejn-sit.png";
import rejnPounce from "@/assets/rejn-pounce.png";
import { cn } from "@/lib/utils";

type RejnPose = "wave" | "dance" | "sleep" | "sit" | "pounce";

const poseMap: Record<RejnPose, { src: string; alt: string; animation: any }> = {
  wave: {
    src: rejnWave,
    alt: "Rejn mascot waving hello",
    animation: {
      rotate: [0, 2, 0, -2, 0],
      y: [0, -4, 0],
      transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
    },
  },
  dance: {
    src: rejnDance,
    alt: "Rejn mascot dancing",
    animation: {
      rotate: [0, 4, 0, -4, 0],
      y: [0, -10, 0],
      scale: [1, 1.02, 1],
      transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    },
  },
  sleep: {
    src: rejnSleep,
    alt: "Rejn mascot sleeping peacefully",
    animation: {
      scale: [1, 1.03, 1],
      opacity: [0.95, 1, 0.95],
      transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
    },
  },
  sit: {
    src: rejnSit,
    alt: "Rejn mascot sitting",
    animation: {
      y: [0, -6, 0],
      rotate: [0, -1.5, 1.5, 0],
      transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
    },
  },
  pounce: {
    src: rejnPounce,
    alt: "Rejn mascot playfully pouncing",
    animation: {
      x: [0, 8, 0],
      y: [0, -6, 0],
      transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

interface RejnMascotProps {
  pose?: RejnPose;
  className?: string;
}

export function RejnMascot({ pose = "sit", className }: RejnMascotProps) {
  const config = poseMap[pose];

  return (
    <motion.img
      src={config.src}
      alt={config.alt}
      className={cn("select-none will-change-transform", className)}
      animate={config.animation}
      loading="lazy"
      decoding="async"
    />
  );
}
