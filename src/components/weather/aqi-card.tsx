import { Wind } from "lucide-react";
import { AQIData } from "@/types/hyperlocal-weather";

interface AQICardProps {
  data: AQIData;
}

const getAQILevel = (aqi: number) => {
  if (aqi <= 50) return { label: "Good", color: "text-blue-500", bg: "bg-blue-500/20" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-500", bg: "bg-yellow-500/20" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "text-orange-500", bg: "bg-orange-500/20" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-500", bg: "bg-red-500/20" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-500", bg: "bg-purple-500/20" };
  return { label: "Hazardous", color: "text-red-900", bg: "bg-red-900/20" };
};

export function AQICard({ data }: AQICardProps) {
  if (!data) return null;

  const level = getAQILevel(data.value);

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Air Quality Index</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className={`${level.bg} p-4 rounded-xl`}>
            <div className={`text-3xl font-bold ${level.color}`}>{data.value}</div>
          </div>
          <div>
            <div className={`font-semibold ${level.color}`}>{level.label}</div>
            <div className="text-xs text-muted-foreground">US EPA Index</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-muted/30 border border-border/30">
            <div className="text-muted-foreground">PM2.5</div>
            <div className="font-semibold">{data.pm25.toFixed(1)} μg/m³</div>
          </div>
          <div className="p-2 rounded-xl bg-muted/30 border border-border/30">
            <div className="text-muted-foreground">PM10</div>
            <div className="font-semibold">{data.pm10.toFixed(1)} μg/m³</div>
          </div>
          <div className="p-2 rounded-xl bg-muted/30 border border-border/30">
            <div className="text-muted-foreground">O₃</div>
            <div className="font-semibold">{data.o3.toFixed(1)} μg/m³</div>
          </div>
          <div className="p-2 rounded-xl bg-muted/30 border border-border/30">
            <div className="text-muted-foreground">NO₂</div>
            <div className="font-semibold">{data.no2.toFixed(1)} μg/m³</div>
          </div>
        </div>
      </div>
    </div>
  );
}
