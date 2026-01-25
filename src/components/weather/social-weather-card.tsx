import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Camera, Loader2, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind, Droplets, Thermometer } from "lucide-react";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";
import rainzLogo from "@/assets/rainz-logo-new.png";
import { LocationCard } from "./location-card";

interface SocialWeatherCardProps {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  isImperial: boolean;
  highTemp?: number;
  lowTemp?: number;
  actualStationName?: string;
}

const getConditionIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
  if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return Snowflake;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return Cloud;
  return Sun;
};

export function SocialWeatherCard({
  location,
  temperature,
  feelsLike,
  condition,
  humidity,
  windSpeed,
  isImperial,
  highTemp,
  lowTemp,
  actualStationName,
}: SocialWeatherCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showLocationCard, setShowLocationCard] = useState(false);

  const ConditionIcon = getConditionIcon(condition);

  const formatTemp = (t: number) => `${Math.round(t)}°${isImperial ? "F" : "C"}`;

  // Fetch location image when dialog opens
  useEffect(() => {
    if (open && location && !locationImage) {
      setImageLoading(true);
      // Use Unsplash Source for location-based images (no API key needed)
      const cityName = location.split(",")[0].trim();
      const imageUrl = `https://source.unsplash.com/800x1000/?${encodeURIComponent(cityName)},city,landmark`;
      
      // Preload the image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setLocationImage(imageUrl);
        setImageLoading(false);
      };
      img.onerror = () => {
        // Fallback to a generic weather/landscape image
        setLocationImage(`https://source.unsplash.com/800x1000/?weather,sky,${condition.toLowerCase()}`);
        setImageLoading(false);
      };
      img.src = imageUrl;
    }
  }, [open, location, locationImage, condition]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });

      // Try native share first (mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `rainz-weather-${location.replace(/\s+/g, "-")}.png`, { type: "image/png" });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Weather in ${location}`,
              text: `Current weather: ${temperature}° ${condition}`,
            });
            setIsGenerating(false);
            return;
          }
        } catch (e) {
          console.log("Share failed, falling back to download:", e);
        }
      }

      // Fallback to download
      const link = document.createElement("a");
      link.download = `rainz-weather-${location.replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();

      toast({ title: "Downloaded!", description: "Weather card saved to your device" });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Error", description: "Failed to generate image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* This button now opens the LocationCard (landmark photo card) */}
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowLocationCard(true)}>
        <Camera className="h-4 w-4" />
        Share Card
      </Button>

      <LocationCard
        open={showLocationCard}
        onOpenChange={setShowLocationCard}
        temperature={temperature}
        location={location}
        actualStationName={actualStationName || location}
        isImperial={isImperial}
      />

      {/* Hidden dialog - the SocialWeatherCard photo card is now opened from CurrentWeather */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Weather Card</DialogTitle>
          </DialogHeader>

          {/* Preview Card */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl aspect-[4/5]"
            style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}
          >
            {/* Background Image */}
            {imageLoading ? (
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            ) : locationImage ? (
              <img 
                src={locationImage} 
                alt={location}
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />
            )}
            
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
              {/* Header */}
              <div>
                <p className="text-sm opacity-90 mb-1 drop-shadow-md">
                  {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </p>
                <h2 className="text-xl font-bold truncate drop-shadow-lg">{location}</h2>
              </div>

              {/* Main temp & icon */}
              <div className="flex items-center justify-between py-6">
                <div>
                  <div className="text-7xl font-bold tracking-tight drop-shadow-lg">{formatTemp(temperature)}</div>
                  <p className="text-lg opacity-95 mt-1 drop-shadow-md">{condition}</p>
                </div>
                <ConditionIcon className="h-24 w-24 opacity-95 drop-shadow-lg" />
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-white/30 backdrop-blur-sm bg-black/20 -mx-6 px-6">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 opacity-80" />
                  <p className="text-xs opacity-80">Feels like</p>
                  <p className="font-semibold drop-shadow-sm">{formatTemp(feelsLike)}</p>
                </div>
                <div className="text-center">
                  <Wind className="h-5 w-5 mx-auto mb-1 opacity-80" />
                  <p className="text-xs opacity-80">Wind</p>
                  <p className="font-semibold drop-shadow-sm">{windSpeed} {isImperial ? "mph" : "km/h"}</p>
                </div>
                <div className="text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1 opacity-80" />
                  <p className="text-xs opacity-80">Humidity</p>
                  <p className="font-semibold drop-shadow-sm">{humidity}%</p>
                </div>
              </div>

              {/* High/Low */}
              {highTemp !== undefined && lowTemp !== undefined && (
                <div className="flex justify-center gap-6 py-2">
                  <span className="opacity-90 drop-shadow-sm">H: {formatTemp(highTemp)}</span>
                  <span className="opacity-90 drop-shadow-sm">L: {formatTemp(lowTemp)}</span>
                </div>
              )}

              {/* Branding */}
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/20">
                <img src={rainzLogo} alt="Rainz" className="h-6 w-6 rounded" />
                <span className="text-sm font-medium opacity-90 drop-shadow-sm">rainz.lovable.app</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Button className="flex-1" onClick={handleDownload} disabled={isGenerating || imageLoading}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {navigator.share ? "Share" : "Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export a function to open the social card dialog externally
export function useSocialWeatherCardTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), setIsOpen };
}