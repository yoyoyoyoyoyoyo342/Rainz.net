import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Navigation2, Umbrella, Clock, AlertCircle } from 'lucide-react';
import type { RouteResult } from './dry-route';

interface DryRouteARProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteResult;
  userPosition: [number, number] | null;
  currentStepIdx: number;
  distanceToNext: number | null;
  isImperial: boolean;
}

export function DryRouteAR({
  open,
  onOpenChange,
  route,
  userPosition,
  currentStepIdx,
  distanceToNext,
  isImperial,
}: DryRouteARProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const formatDist = (meters: number) => {
    if (isImperial) {
      if (meters < 160) return `${Math.round(meters * 3.28084)} ft`;
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Camera
  useEffect(() => {
    if (!open) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
      return;
    }
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        setCameraStream(stream);
        setPermissionDenied(false);
      } catch {
        setPermissionDenied(true);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Compass
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    const webkitHeading = (e as any).webkitCompassHeading;
    if (typeof webkitHeading === 'number') {
      setHeading(webkitHeading);
    } else if (e.alpha !== null) {
      setHeading(360 - e.alpha);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission().then((r: string) => {
        if (r === 'granted') {
          window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
          window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
        }
      }).catch(() => {});
    } else {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  }, [open, handleOrientation]);

  // Calculate bearing to next waypoint
  const getBearing = () => {
    if (!userPosition || !route.steps[currentStepIdx]) return null;
    const step = route.steps[currentStepIdx];
    const target = step.geometry[step.geometry.length - 1] || route.geometry[0];
    if (!target) return null;

    const lat1 = (userPosition[0] * Math.PI) / 180;
    const lat2 = (target[0] * Math.PI) / 180;
    const dLon = ((target[1] - userPosition[1]) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const bearing = getBearing();
  const arrowRotation = bearing !== null && heading !== null ? bearing - heading : 0;
  const currentStep = route.steps[currentStepIdx];

  const rainColor = route.rainScore < 30 ? 'text-green-400' : route.rainScore < 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] p-0 m-0 border-0 bg-black sm:rounded-none">
        <div className="relative w-full h-full overflow-hidden">
          {cameraStream ? (
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          ) : permissionDenied ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p className="text-lg font-medium mb-2">Camera Access Required</p>
                <p className="text-sm opacity-70">Enable camera for AR navigation</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="animate-pulse text-white">Starting camera...</div>
            </div>
          )}

          {/* Close */}
          <Button
            variant="ghost" size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 text-white hover:bg-black/70"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Direction arrow */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              style={{
                transform: `rotate(${arrowRotation}deg)`,
                transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Navigation2 className="w-20 h-20 text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
            </div>
          </div>

          {/* HUD top bar */}
          <div className="absolute top-16 left-4 right-4 z-40">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4">
              <p className="text-white text-lg font-bold capitalize truncate">
                {currentStep?.instruction || 'Follow route'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-white/80">
                  {distanceToNext !== null ? formatDist(distanceToNext) : '...'}
                </span>
                <span className={`flex items-center gap-1 ${rainColor}`}>
                  <Umbrella className="w-3.5 h-3.5" /> {route.rainScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Bottom ETA bar */}
          <div className="absolute bottom-8 left-4 right-4 z-40">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {Math.round(route.steps.slice(currentStepIdx).reduce((a, s) => a + s.duration, 0) / 60)} min
                </span>
              </div>
              <div className="text-white/60 text-xs">
                {heading !== null ? `${Math.round(heading)}° compass` : 'Calibrating...'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
