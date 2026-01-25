import { useState, useEffect, useRef, useCallback } from "react";
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
  isImperial?: boolean;
}

// Convert wind direction to cardinal
const getCardinalDirection = (deg: number) => {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[Math.round(deg / 22.5) % 16];
};

// Calculate base aurora probability from latitude (used as fallback)
const getLatitudeAuroraBase = (lat: number): number => {
  const absLat = Math.abs(lat);
  if (absLat < 50) return 0;
  if (absLat > 75) return 10;
  if (absLat >= 65 && absLat <= 72) return 40;
  if (absLat >= 60) return 25;
  if (absLat >= 55) return 15;
  return 5;
};

export function ARWeatherOverlay({
  windSpeed,
  windDirection,
  latitude,
  longitude,
  condition,
  uvIndex,
  auroraChance: providedAuroraChance,
  isImperial = false,
}: ARWeatherOverlayProps) {
  const [open, setOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [auroraChance, setAuroraChance] = useState<number>(providedAuroraChance ?? 0);
  const [kpIndex, setKpIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch real aurora probability from NOAA Kp index
  useEffect(() => {
    if (!open) return;
    const absLat = Math.abs(latitude);
    // Only fetch for latitudes that could see aurora
    if (absLat < 45) {
      setAuroraChance(0);
      return;
    }

    const fetchKpIndex = async () => {
      try {
        // NOAA Space Weather Prediction Center - planetary Kp index
        const response = await fetch(
          "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
        );
        if (!response.ok) throw new Error("Failed to fetch Kp");
        const data = await response.json();
        // Data is array of arrays: [time_tag, Kp, Kp_fraction, a_running, station_count]
        // Skip header row, get most recent
        if (data && data.length > 1) {
          const latest = data[data.length - 1];
          const kp = parseFloat(latest[1]);
          setKpIndex(kp);
          
          // Calculate aurora probability based on Kp and latitude
          // Kp 0-1: aurora visible only at very high latitudes (>67°)
          // Kp 3: aurora visible at ~65°
          // Kp 5: aurora visible at ~55°
          // Kp 7: aurora visible at ~50°
          // Kp 9: aurora visible at ~45°
          
          const latitudeThresholds: Record<number, number> = {
            9: 45, 8: 48, 7: 50, 6: 52, 5: 55, 4: 58, 3: 62, 2: 65, 1: 68, 0: 70
          };
          
          const kpRounded = Math.min(9, Math.floor(kp));
          const minLat = latitudeThresholds[kpRounded] || 70;
          
          if (absLat < minLat) {
            setAuroraChance(0);
          } else {
            // Calculate probability based on how far north of threshold
            const latBonus = Math.min(30, (absLat - minLat) * 3);
            const kpBonus = kp * 8; // Higher Kp = more activity
            
            // Cloud cover penalty (rough estimate from condition)
            const c = condition.toLowerCase();
            let cloudPenalty = 0;
            if (c.includes("overcast") || c.includes("fog")) cloudPenalty = 70;
            else if (c.includes("cloud")) cloudPenalty = 40;
            else if (c.includes("partly")) cloudPenalty = 20;
            
            const rawChance = Math.round(20 + latBonus + kpBonus - cloudPenalty);
            setAuroraChance(Math.max(0, Math.min(95, rawChance)));
          }
        }
      } catch (error) {
        console.error("Failed to fetch Kp index:", error);
        // Fallback to latitude-based estimate
        setAuroraChance(getLatitudeAuroraBase(latitude));
      }
    };

    fetchKpIndex();
  }, [open, latitude, condition]);

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

  // Handle device orientation for compass - CONTINUOUS updates
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // Use webkitCompassHeading for iOS (gives true heading), otherwise use alpha
    const webkitHeading = (e as any).webkitCompassHeading;
    if (typeof webkitHeading === "number") {
      // iOS: webkitCompassHeading is degrees from true north, 0-360
      setHeading(webkitHeading);
    } else if (e.alpha !== null) {
      // Android/other: alpha is rotation around z-axis
      // If absolute is true, alpha is compass heading
      // If not, we need to use it as relative heading
      if (e.absolute) {
        // Absolute orientation - alpha 0 means north
        setHeading(360 - e.alpha);
      } else {
        // Relative orientation - still usable for compass display
        setHeading(360 - e.alpha);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    // Request permission on iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response === "granted") {
            window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
            window.addEventListener("deviceorientation", handleOrientation as EventListener, true);
          }
        })
        .catch(console.error);
    } else {
      // Try absolute orientation first (more accurate compass), fallback to regular
      window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
      window.addEventListener("deviceorientation", handleOrientation as EventListener, true);
    }

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener, true);
    };
  }, [open, handleOrientation]);

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

  // Compass needle rotation: points to north
  // heading = current device heading (degrees from north)
  // To point needle north, rotate it by -heading
  const compassRotation = heading !== null ? -heading : 0;

  // Wind arrow: shows where wind is coming FROM relative to user's view
  // windDirection is meteorological (direction wind comes FROM)
  const windArrowRotation = heading !== null
    ? windDirection - heading
    : windDirection;

  // Aurora direction: north for Northern Hemisphere, south for Southern
  const auroraDirection = latitude >= 0 ? 0 : 180;
  const auroraArrowRotation = heading !== null
    ? auroraDirection - heading
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
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
                  style={{ transform: `rotate(${compassRotation}deg)` }}
                >
                  <div className="w-20 h-20 rounded-full border-2 border-white/50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <Navigation className="h-10 w-10 text-red-500" style={{ transform: "rotate(-45deg)" }} />
                  </div>
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                  {heading !== null ? `${Math.round(heading)}° ${getCardinalDirection(heading)}` : "Calibrating..."}
                </div>
              </div>
            </div>

            {/* Wind Direction Arrow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="flex flex-col items-center transition-transform duration-100"
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
                    <p className="text-lg font-bold">{windSpeed} {isImperial ? "mph" : "km/h"}</p>
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
                      <p className="text-sm opacity-70">
                        Aurora {latitude >= 0 ? "Borealis" : "Australis"}
                        {kpIndex !== null && <span className="ml-2 text-purple-300">(Kp {kpIndex.toFixed(1)})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-purple-300">
                      Look {latitude >= 0 ? "North" : "South"}
                    </p>
                    <div
                      className="inline-block mt-1 transition-transform duration-100"
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
