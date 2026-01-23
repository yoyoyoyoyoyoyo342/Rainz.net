import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Compass, Wind, Sparkles, Camera, X, Navigation, AlertCircle } from "lucide-react";

interface ARWeatherOverlayProps {
  windSpeed: number;
  windDirection: number;
  latitude: number;
  longitude: number;
  condition: string;
  uvIndex?: number;
  auroraChance?: number;
}

// Calculate aurora probability based on latitude and conditions
const calculateAuroraChance = (lat: number, cloudCover?: number) => {
  // Best viewing between 65-72° latitude
  const absLat = Math.abs(lat);
  if (absLat < 50) return 0;
  if (absLat > 75) return 10;
  
  let base = 0;
  if (absLat >= 65 && absLat <= 72) base = 40;
  else if (absLat >= 60) base = 25;
  else if (absLat >= 55) base = 15;
  else base = 5;
  
  // Reduce for cloud cover
  if (cloudCover && cloudCover > 50) base *= (100 - cloudCover) / 100;
  
  return Math.round(base);
};

// Convert wind direction to cardinal
const getCardinalDirection = (deg: number) => {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[Math.round(deg / 22.5) % 16];
};

export function ARWeatherOverlay({
  windSpeed,
  windDirection,
  latitude,
  longitude,
  condition,
  uvIndex,
  auroraChance: providedAuroraChance,
}: ARWeatherOverlayProps) {
  const [open, setOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const auroraChance = providedAuroraChance ?? calculateAuroraChance(latitude);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setPermissionDenied(false);
    } catch (error) {
      console.error("Camera access denied:", error);
      setPermissionDenied(true);
    }
  };

  // Handle device orientation
  useEffect(() => {
    if (!open) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      setDeviceOrientation({
        alpha: e.alpha || 0,
        beta: e.beta || 0,
        gamma: e.gamma || 0,
      });
    };

    // Request permission on iOS
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      (DeviceOrientationEvent as any).requestPermission().then((response: string) => {
        if (response === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      });
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [open]);

  // Set video source
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup camera
  useEffect(() => {
    if (!open && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [open]);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      await startCamera();
    }
  };

  // Calculate compass rotation (north direction)
  const compassRotation = deviceOrientation ? -deviceOrientation.alpha : 0;
  
  // Calculate wind arrow direction relative to device
  const windArrowRotation = deviceOrientation 
    ? windDirection - deviceOrientation.alpha 
    : windDirection;

  // Calculate aurora direction (north for Northern Hemisphere, south for Southern)
  const auroraDirection = latitude >= 0 ? 0 : 180;
  const auroraArrowRotation = deviceOrientation
    ? auroraDirection - deviceOrientation.alpha
    : auroraDirection;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="h-4 w-4" />
          AR View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full h-[100dvh] p-0 m-0 border-0 bg-black">
        <div className="relative w-full h-full overflow-hidden">
          {/* Camera feed */}
          {cameraStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : permissionDenied ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p className="text-lg font-medium mb-2">Camera Access Required</p>
                <p className="text-sm opacity-70">Please allow camera access to use AR features</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="animate-pulse text-white">Starting camera...</div>
            </div>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 text-white hover:bg-black/70"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* AR Overlay Elements */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Compass */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2">
              <div className="relative w-24 h-24">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: `rotate(${compassRotation}deg)` }}
                >
                  <div className="w-20 h-20 rounded-full border-2 border-white/50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <Navigation className="h-10 w-10 text-red-500" style={{ transform: "rotate(-45deg)" }} />
                  </div>
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                  {deviceOrientation ? `${Math.round(deviceOrientation.alpha)}°` : "N"}
                </div>
              </div>
            </div>

            {/* Wind Direction Arrow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="flex flex-col items-center"
                style={{ transform: `rotate(${windArrowRotation}deg)` }}
              >
                <Wind className="h-16 w-16 text-cyan-400 drop-shadow-lg" />
                <div
                  className="w-1 h-24 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"
                  style={{ transform: "rotate(180deg)" }}
                />
              </div>
            </div>

            {/* Wind Info Card */}
            <Card className="absolute bottom-32 left-4 right-4 bg-black/60 backdrop-blur-md border-white/20 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wind className="h-8 w-8 text-cyan-400" />
                  <div>
                    <p className="text-lg font-bold">{windSpeed} mph</p>
                    <p className="text-sm opacity-70">
                      {getCardinalDirection(windDirection)} ({Math.round(windDirection)}°)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-70">Wind Direction</p>
                  <p className="text-xs opacity-50">Arrow points where wind blows TO</p>
                </div>
              </div>
            </Card>

            {/* Aurora Card (if in aurora zone) */}
            {auroraChance > 0 && (
              <Card className="absolute bottom-52 left-4 right-4 bg-black/60 backdrop-blur-md border-purple-500/30 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-purple-400" />
                    <div>
                      <p className="text-lg font-bold">{auroraChance}% Chance</p>
                      <p className="text-sm opacity-70">Aurora Borealis</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-purple-300">
                      Look {latitude >= 0 ? "North" : "South"}
                    </p>
                    <div
                      className="inline-block mt-1"
                      style={{ transform: `rotate(${auroraArrowRotation}deg)` }}
                    >
                      <Navigation className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Current Conditions */}
            <Card className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border-white/20 text-white px-4 py-2">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 opacity-70" />
                <span className="text-sm">{condition}</span>
                {uvIndex !== undefined && uvIndex > 0 && (
                  <span className="text-xs bg-yellow-500/30 px-2 py-0.5 rounded">UV {uvIndex}</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
