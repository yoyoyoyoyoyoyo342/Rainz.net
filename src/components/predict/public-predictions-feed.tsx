import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSnow, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
  id: string;
  location_name: string;
  predicted_condition: string;
  confidence_multiplier: number | null;
  created_at: string;
  display_name?: string;
}

const conditionIcon = (c: string) => {
  const k = (c || "").toLowerCase();
  if (k.includes("rain") || k.includes("drizzle")) return CloudRain;
  if (k.includes("snow")) return CloudSnow;
  if (k.includes("clear") || k.includes("sun")) return Sun;
  return Cloud;
};

const conditionTone = (c: string) => {
  const k = (c || "").toLowerCase();
  if (k.includes("rain")) return "text-blue-500 bg-blue-500/10";
  if (k.includes("snow")) return "text-sky-400 bg-sky-400/10";
  if (k.includes("clear") || k.includes("sun")) return "text-amber-500 bg-amber-500/10";
  return "text-slate-400 bg-slate-400/10";
};

function timeAgo(date: string): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function PublicPredictionsFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("weather_predictions")
        .select("id, location_name, predicted_condition, confidence_multiplier, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const userIds = Array.from(new Set((data || []).map((d: any) => d.user_id).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        (profs || []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Someone"; });
      }

      if (!mounted) return;
      setItems((data || []).map((d: any) => ({
        id: d.id,
        location_name: d.location_name,
        predicted_condition: d.predicted_condition,
        confidence_multiplier: d.confidence_multiplier,
        created_at: d.created_at,
        display_name: nameMap[d.user_id] || "Someone",
      })));
      setLoading(false);
    };
    fetchInitial();

    const channel = supabase
      .channel("public-predictions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "weather_predictions" },
        async (payload) => {
          const row: any = payload.new;
          let display_name = "Someone";
          if (row.user_id) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", row.user_id)
              .maybeSingle();
            display_name = prof?.display_name || "Someone";
          }
          setItems((prev) => [{
            id: row.id,
            location_name: row.location_name,
            predicted_condition: row.predicted_condition,
            confidence_multiplier: row.confidence_multiplier,
            created_at: row.created_at,
            display_name,
          }, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card className="bg-background/40 border-border/50 overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Globe className="w-4 h-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Live Feed</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Recent predictions worldwide</span>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          {items.map((it) => {
            const Icon = conditionIcon(it.predicted_condition);
            const tone = conditionTone(it.predicted_condition);
            return (
              <div
                key={it.id}
                className="shrink-0 w-44 rounded-xl border border-border/40 bg-background/60 p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", tone)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{it.location_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{it.display_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(it.created_at)}</span>
                  {it.confidence_multiplier && it.confidence_multiplier > 1 && (
                    <span className="text-[10px] font-bold text-amber-500 inline-flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />{it.confidence_multiplier}x
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
