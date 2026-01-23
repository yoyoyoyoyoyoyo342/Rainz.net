import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Share2, Loader2, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind, Droplets, Thermometer } from "lucide-react";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";
import rainzLogo from "@/assets/rainz-logo-new.png";

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
}

const getConditionIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
  if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return Snowflake;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return Cloud;
  return Sun;
};

const getGradient = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "from-slate-800 via-purple-900 to-slate-900";
  if (c.includes("rain") || c.includes("drizzle")) return "from-slate-600 via-blue-700 to-slate-800";
  if (c.includes("snow") || c.includes("ice")) return "from-blue-200 via-white to-blue-300";
  if (c.includes("cloud") || c.includes("overcast")) return "from-gray-400 via-gray-500 to-gray-600";
  if (c.includes("fog") || c.includes("mist")) return "from-gray-300 via-gray-400 to-gray-500";
  return "from-sky-400 via-blue-500 to-indigo-600";
};

const needsDarkText = (condition: string) => {
  const c = condition.toLowerCase();
  return c.includes("snow") || c.includes("fog") || c.includes("mist");
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
}: SocialWeatherCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const ConditionIcon = getConditionIcon(condition);
  const gradient = getGradient(condition);
  const darkText = needsDarkText(condition);
  const textColor = darkText ? "text-gray-900" : "text-white";

  const formatTemp = (t: number) => `${Math.round(t)}°${isImperial ? "F" : "C"}`;

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Weather Card</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 aspect-[4/5]`}
          style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute bottom-20 left-10 w-24 h-24 rounded-full bg-white/20 blur-2xl" />
          </div>

          {/* Content */}
          <div className={`relative z-10 h-full flex flex-col justify-between ${textColor}`}>
            {/* Header */}
            <div>
              <p className="text-sm opacity-80 mb-1">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
              <h2 className="text-xl font-bold truncate">{location}</h2>
            </div>

            {/* Main temp & icon */}
            <div className="flex items-center justify-between py-6">
              <div>
                <div className="text-7xl font-bold tracking-tight">{formatTemp(temperature)}</div>
                <p className="text-lg opacity-90 mt-1">{condition}</p>
              </div>
              <ConditionIcon className="h-24 w-24 opacity-90" />
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-white/20">
              <div className="text-center">
                <Thermometer className="h-5 w-5 mx-auto mb-1 opacity-70" />
                <p className="text-xs opacity-70">Feels like</p>
                <p className="font-semibold">{formatTemp(feelsLike)}</p>
              </div>
              <div className="text-center">
                <Wind className="h-5 w-5 mx-auto mb-1 opacity-70" />
                <p className="text-xs opacity-70">Wind</p>
                <p className="font-semibold">{windSpeed} {isImperial ? "mph" : "km/h"}</p>
              </div>
              <div className="text-center">
                <Droplets className="h-5 w-5 mx-auto mb-1 opacity-70" />
                <p className="text-xs opacity-70">Humidity</p>
                <p className="font-semibold">{humidity}%</p>
              </div>
            </div>

            {/* High/Low */}
            {highTemp !== undefined && lowTemp !== undefined && (
              <div className="flex justify-center gap-6 py-2">
                <span className="opacity-80">H: {formatTemp(highTemp)}</span>
                <span className="opacity-80">L: {formatTemp(lowTemp)}</span>
              </div>
            )}

            {/* Branding */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
              <img src={rainzLogo} alt="Rainz" className="h-6 w-6 rounded" />
              <span className="text-sm font-medium opacity-80">rainz.lovable.app</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button className="flex-1" onClick={handleDownload} disabled={isGenerating}>
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
  );
}
