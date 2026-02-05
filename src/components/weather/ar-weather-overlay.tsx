import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
 import { Compass, Wind, Sparkles, Camera, X, Navigation, AlertCircle, Sun, Moon, Droplets, Thermometer, Download } from "lucide-react";
 import { toast } from "sonner";

interface ARWeatherOverlayProps {
  windSpeed: number;
  windDirection: number;
  latitude: number;
  longitude: number;
  condition: string;
  uvIndex?: number;
  auroraChance?: number;
  isImperial?: boolean;
   temperature?: number;
   humidity?: number;
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
   temperature,
   humidity,
}: ARWeatherOverlayProps) {
  const [open, setOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [auroraChance, setAuroraChance] = useState<number>(providedAuroraChance ?? 0);
  const [kpIndex, setKpIndex] = useState<number | null>(null);
   const [sunPosition, setSunPosition] = useState<{ altitude: number; azimuth: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
   const containerRef = useRef<HTMLDivElement>(null);

   // Calculate sun position
   useEffect(() => {
     if (!open) return;
     
     const now = new Date();
     const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
     const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
     
     const hour = now.getHours() + now.getMinutes() / 60;
     const solarHour = hour + (longitude / 15) - (now.getTimezoneOffset() / 60);
     const hourAngle = (solarHour - 12) * 15;
     
     const latRad = latitude * Math.PI / 180;
     const decRad = declination * Math.PI / 180;
     const haRad = hourAngle * Math.PI / 180;
     
     const altitude = Math.asin(
       Math.sin(latRad) * Math.sin(decRad) +
       Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
     ) * 180 / Math.PI;
     
     const azimuth = Math.atan2(
       Math.sin(haRad),
       Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
     ) * 180 / Math.PI + 180;
     
     setSunPosition({ altitude, azimuth });
   }, [open, latitude, longitude]);

   // Check if it's daytime
   const isDaytime = sunPosition ? sunPosition.altitude > 0 : true;

   // Photo capture functionality
   const capturePhoto = async () => {
     if (!videoRef.current || !containerRef.current) return;
     
     try {
       const canvas = document.createElement('canvas');
       const video = videoRef.current;
       canvas.width = video.videoWidth || 1920;
       canvas.height = video.videoHeight || 1080;
       
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       
       // Draw video frame
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
       
       // Add overlay graphics
       ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
       ctx.fillRect(20, canvas.height - 100, 300, 80);
       
       ctx.fillStyle = 'white';
       ctx.font = 'bold 24px system-ui';
       ctx.fillText(`${windSpeed} ${isImperial ? 'mph' : 'km/h'} ${getCardinalDirection(windDirection)}`, 40, canvas.height - 60);
       
       ctx.font = '16px system-ui';
       ctx.fillText(condition, 40, canvas.height - 35);
       
       // Branding
       ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
       ctx.fillRect(canvas.width - 150, 20, 130, 30);
       ctx.fillStyle = 'white';
       ctx.font = '14px system-ui';
       ctx.fillText('📍 Rainz.net', canvas.width - 140, 40);
       
       // Download
       const link = document.createElement('a');
       link.download = `rainz-ar-${Date.now()}.jpg`;
       link.href = canvas.toDataURL('image/jpeg', 0.9);
       link.click();
       
       toast.success("AR snapshot saved!");
     } catch (error) {
       console.error("Failed to capture AR photo:", error);
       toast.error("Failed to save snapshot");
     }
   };

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

   // Get UV index color and label
   const getUVInfo = (uv: number) => {
     if (uv <= 2) return { color: 'bg-green-500', label: 'Low' };
     if (uv <= 5) return { color: 'bg-yellow-500', label: 'Moderate' };
     if (uv <= 7) return { color: 'bg-orange-500', label: 'High' };
     if (uv <= 10) return { color: 'bg-red-500', label: 'Very High' };
     return { color: 'bg-purple-500', label: 'Extreme' };
   };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="h-4 w-4" />
          AR View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full h-[100dvh] p-0 m-0 border-0 bg-black">
         <div ref={containerRef} className="relative w-full h-full overflow-hidden">
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

           {/* Capture button */}
           {cameraStream && (
             <Button
               variant="ghost"
               size="icon"
               className="absolute top-4 right-16 z-50 bg-black/50 text-white hover:bg-black/70"
               onClick={capturePhoto}
             >
               <Download className="h-6 w-6" />
             </Button>
           )}

          {/* AR Overlay Elements */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Weather condition gradient overlay */}
             <div 
               className="absolute inset-0 opacity-20 transition-opacity duration-500"
               style={{
                 background: condition.toLowerCase().includes('rain') 
                   ? 'linear-gradient(to bottom, rgba(59, 130, 246, 0.3), transparent)'
                   : condition.toLowerCase().includes('snow')
                   ? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent)'
                   : condition.toLowerCase().includes('cloud') || condition.toLowerCase().includes('overcast')
                   ? 'linear-gradient(to bottom, rgba(100, 116, 139, 0.3), transparent)'
                   : isDaytime 
                   ? 'linear-gradient(to bottom, rgba(251, 191, 36, 0.2), transparent)'
                   : 'linear-gradient(to bottom, rgba(30, 41, 59, 0.3), transparent)'
               }}
             />

            {/* Compass */}
             <div className="absolute top-24 left-1/2 -translate-x-1/2">
              <div className="relative w-24 h-24">
                <div
                   className="absolute inset-0 flex items-center justify-center"
                   style={{ 
                     transform: `rotate(${compassRotation}deg)`,
                     transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                   }}
                >
                   <div className="w-20 h-20 rounded-full border-2 border-white/40 bg-black/40 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Navigation className="h-10 w-10 text-red-500" style={{ transform: "rotate(-45deg)" }} />
                  </div>
                </div>
                 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white whitespace-nowrap font-medium">
                  {heading !== null ? `${Math.round(heading)}° ${getCardinalDirection(heading)}` : "Calibrating..."}
                </div>
              </div>
            </div>

             {/* Sun/Moon Position Indicator */}
             {sunPosition && sunPosition.altitude > -18 && (
               <div 
                 className="absolute"
                 style={{
                   top: `${Math.max(10, 50 - sunPosition.altitude * 0.8)}%`,
                   left: '50%',
                   transform: `translateX(-50%) rotate(${heading !== null ? sunPosition.azimuth - heading : 0}deg)`,
                   transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                 }}
               >
                 <div className="flex flex-col items-center">
                   {isDaytime ? (
                     <Sun className="h-12 w-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                   ) : (
                     <Moon className="h-10 w-10 text-slate-200 drop-shadow-[0_0_10px_rgba(226,232,240,0.5)]" />
                   )}
                   <span className="text-xs text-white/80 mt-1 bg-black/40 px-2 py-0.5 rounded-full">
                     {isDaytime ? `${Math.round(sunPosition.altitude)}°` : 'Night'}
                   </span>
                 </div>
               </div>
             )}

            {/* Wind Direction Arrow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                 className="flex flex-col items-center"
                 style={{ 
                   transform: `rotate(${windArrowRotation}deg)`,
                   transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                 }}
              >
                 <Wind className="h-16 w-16 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <div
                  className="w-1 h-24 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"
                  style={{ transform: "rotate(180deg)" }}
                />
              </div>
            </div>

             {/* Temperature & Humidity HUD */}
             {(temperature !== undefined || humidity !== undefined) && (
               <div className="absolute top-24 right-4 flex flex-col gap-2">
                 {temperature !== undefined && (
                   <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white px-3 py-2">
                     <div className="flex items-center gap-2">
                       <Thermometer className="h-5 w-5 text-orange-400" />
                       <span className="font-bold text-lg">{Math.round(temperature)}°{isImperial ? 'F' : 'C'}</span>
                     </div>
                   </Card>
                 )}
                 {humidity !== undefined && (
                   <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white px-3 py-2">
                     <div className="flex items-center gap-2">
                       <Droplets className="h-5 w-5 text-blue-400" />
                       <span className="font-medium">{humidity}%</span>
                     </div>
                   </Card>
                 )}
               </div>
             )}

             {/* UV Index Meter (if daytime and UV data available) */}
             {isDaytime && uvIndex !== undefined && uvIndex > 0 && (
               <div className="absolute top-24 left-4">
                 <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white px-3 py-2">
                   <div className="flex items-center gap-2">
                     <Sun className="h-5 w-5 text-yellow-400" />
                     <div className="flex flex-col">
                       <span className="text-xs opacity-70">UV Index</span>
                       <div className="flex items-center gap-2">
                         <span className="font-bold">{uvIndex}</span>
                         <span className={`text-xs px-2 py-0.5 rounded-full ${getUVInfo(uvIndex).color}`}>
                           {getUVInfo(uvIndex).label}
                         </span>
                       </div>
                     </div>
                   </div>
                 </Card>
               </div>
             )}

            {/* Wind Info Card */}
             <Card className="absolute bottom-32 left-4 right-4 bg-black/60 backdrop-blur-md border-white/20 text-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-full bg-cyan-400/20">
                     <Wind className="h-6 w-6 text-cyan-400" />
                   </div>
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
               <Card className="absolute bottom-52 left-4 right-4 bg-gradient-to-r from-purple-900/60 to-pink-900/60 backdrop-blur-md border-purple-500/30 text-white p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-full bg-purple-400/20 animate-pulse">
                       <Sparkles className="h-6 w-6 text-purple-400" />
                     </div>
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
                       className="inline-block mt-1"
                       style={{ 
                         transform: `rotate(${auroraArrowRotation}deg)`,
                         transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                       }}
                    >
                      <Navigation className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Current Conditions */}
             <Card className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border-white/20 text-white px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 opacity-70" />
                <span className="text-sm">{condition}</span>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
