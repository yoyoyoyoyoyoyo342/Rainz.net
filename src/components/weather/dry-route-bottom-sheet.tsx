import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';

interface DryRouteBottomSheetProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  snapPoints?: number[]; // percentages of vh, e.g. [10, 50, 90]
  defaultSnap?: number;
  onSnapChange?: (index: number) => void;
}

export function DryRouteBottomSheet({
  children,
  header,
  snapPoints = [12, 45, 85],
  defaultSnap = 1,
  onSnapChange,
}: DryRouteBottomSheetProps) {
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const y = useMotionValue(0);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const snapPositions = snapPoints.map(p => windowHeight * (1 - p / 100));

  // Initialize position
  useEffect(() => {
    y.set(snapPositions[defaultSnap]);
  }, [windowHeight]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const currentY = y.get();
    const velocity = info.velocity.y;

    // Find closest snap point, accounting for velocity
    let targetIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < snapPositions.length; i++) {
      const dist = Math.abs(currentY - snapPositions[i]) - velocity * 0.1 * (currentY > snapPositions[i] ? 1 : -1);
      if (dist < minDist) {
        minDist = dist;
        targetIdx = i;
      }
    }

    // Swipe velocity override
    if (Math.abs(velocity) > 500) {
      if (velocity < 0 && currentSnap < snapPositions.length - 1) {
        targetIdx = currentSnap + 1;
      } else if (velocity > 0 && currentSnap > 0) {
        targetIdx = currentSnap - 1;
      }
    }

    targetIdx = Math.max(0, Math.min(snapPositions.length - 1, targetIdx));
    setCurrentSnap(targetIdx);
    onSnapChange?.(targetIdx);
    animate(y, snapPositions[targetIdx], { type: 'spring', stiffness: 400, damping: 40 });
  }, [snapPositions, currentSnap, onSnapChange, y]);

  const sheetHeight = useTransform(y, (val) => windowHeight - val);

  return (
    <motion.div
      className="fixed left-0 right-0 bottom-0 z-[1500] flex flex-col bg-background rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.15)] border-t border-border/30"
      style={{ height: sheetHeight }}
      drag="y"
      dragConstraints={{ top: snapPositions[snapPositions.length - 1], bottom: snapPositions[0] }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      dragMomentum={false}
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing shrink-0">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Header section - always visible */}
      {header && (
        <div className="px-4 pb-2 shrink-0">
          {header}
        </div>
      )}

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </motion.div>
  );
}
