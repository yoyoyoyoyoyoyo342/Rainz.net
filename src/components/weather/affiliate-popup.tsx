import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AffiliatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weatherCondition?: string;
}

interface ActiveAffiliate {
  business_name: string;
  website_url: string;
  description: string | null;
  weather_condition: string;
}

function mapWeatherToCondition(weather?: string): string | null {
  if (!weather) return null;
  const w = weather.toLowerCase();
  if (w.includes("thunder") || w.includes("storm")) return "storm";
  if (w.includes("snow") || w.includes("sleet") || w.includes("blizzard")) return "snow";
  if (w.includes("rain") || w.includes("drizzle") || w.includes("shower")) return "rain";
  if (w.includes("wind") || w.includes("gust")) return "wind";
  if (w.includes("cloud") || w.includes("overcast") || w.includes("fog") || w.includes("mist")) return "cloudy";
  if (w.includes("sun") || w.includes("clear") || w.includes("fair")) return "sunny";
  return null;
}

export function AffiliatePopup({ open, onOpenChange, weatherCondition }: AffiliatePopupProps) {
  const [affiliate, setAffiliate] = useState<ActiveAffiliate | null>(null);

  useEffect(() => {
    if (!open) return;
    const condition = mapWeatherToCondition(weatherCondition);
    if (!condition) {
      onOpenChange(false);
      return;
    }

    const fetchAffiliate = async () => {
      const { data } = await supabase
        .from("affiliate_applications")
        .select("business_name, website_url, description, weather_condition")
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("weather_condition", condition)
        .limit(1)
        .maybeSingle();

      if (data) {
        setAffiliate(data);
      } else {
        onOpenChange(false);
      }
    };

    fetchAffiliate();
  }, [open, weatherCondition]);

  if (!affiliate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5 text-primary" />
            Sponsored
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            This ad is shown because the current weather matches their campaign.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-foreground">{affiliate.business_name}</h3>
            {affiliate.description && (
              <p className="text-sm text-muted-foreground">{affiliate.description}</p>
            )}
            <Button
              className="w-full"
              onClick={() => window.open(affiliate.website_url, "_blank", "noopener,noreferrer")}
            >
              Visit {affiliate.business_name}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => onOpenChange(false)}>
          No thanks
        </Button>
      </DialogContent>
    </Dialog>
  );
}
