import { Wind, Lock, Crown, Sparkles } from "lucide-react";
import { AQIData } from "@/types/hyperlocal-weather";
import { useSubscription } from "@/hooks/use-subscription";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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
  const { isSubscribed, openCheckout } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!data) return null;

  const handleUpgrade = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    void openCheckout().catch(() => {});
  };

  // Plus-only feature
  if (!isSubscribed) {
    return (
      <div className="overflow-hidden rounded-2xl glass-card border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Air Quality Index</h3>
            <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full ml-auto">
              <Crown className="w-3 h-3" />
              Plus
            </span>
          </div>
        </div>
        <div className="p-6 text-center">
          <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Air Quality Monitoring</p>
          <p className="text-xs text-muted-foreground mb-3">
            Get detailed air quality data and pollutant breakdowns with Rainz+.
          </p>
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Rainz+ • €2/month
          </Button>
        </div>
      </div>
    );
  }

  const level = getAQILevel(data.value);

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      {/* Header without gradient */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Air Quality Index</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className={`${level.bg} p-4 rounded-xl`}>
            <div className={`text-3xl font-bold ${level.color}`}>
              {data.value}
            </div>
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
