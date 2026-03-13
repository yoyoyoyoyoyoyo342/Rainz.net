import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Play, Pause, RotateCcw, Car, Bike, Footprints, PersonStanding, Clock, Route, Trash2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SavedRoute {
  id: string;
  name: string;
  geometry: [number, number][];
  distance: number;
  duration: number;
  transport_mode: string;
  elevation_gain: number;
  avg_pace: number;
  created_at: string;
}

interface RouteHistoryPanelProps {
  onPlayRoute: (route: SavedRoute) => void;
  isPlaying: boolean;
  onStopPlayback: () => void;
  activeRouteId: string | null;
}

const modeIcons: Record<string, React.ReactNode> = {
  driving: <Car className="h-4 w-4" />,
  cycling: <Bike className="h-4 w-4" />,
  walking: <Footprints className="h-4 w-4" />,
  running: <PersonStanding className="h-4 w-4" />,
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function RouteHistoryPanel({ onPlayRoute, isPlaying, onStopPlayback, activeRouteId }: RouteHistoryPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["saved-routes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("saved_routes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as SavedRoute[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await supabase.from("saved_routes").delete().eq("id", routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-routes"] });
      toast.success("Route deleted");
    },
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No saved routes yet</p>
        <p className="text-xs mt-1">Complete a tracked activity to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {routes.map((route) => {
        const isActive = activeRouteId === route.id;
        return (
          <div
            key={route.id}
            className={`p-3 rounded-xl border transition-colors ${
              isActive ? "border-primary bg-primary/5" : "border-border/40 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0 text-muted-foreground">
                  {modeIcons[route.transport_mode] || <Route className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{route.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDistance(route.distance)}</span>
                    <span>·</span>
                    <span>{formatDuration(route.duration)}</span>
                    <span>·</span>
                    <span>{new Date(route.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isActive && isPlaying ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStopPlayback}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPlayRoute(route)}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/60 hover:text-destructive"
                  onClick={() => deleteMutation.mutate(route.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
