import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface PickedLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface PredictionLocationPickerProps {
  active: PickedLocation;
  onChange: (loc: PickedLocation) => void;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "Accept-Language": "en" } }
    );
    const j = await r.json();
    return (
      j?.address?.city ||
      j?.address?.town ||
      j?.address?.village ||
      j?.address?.municipality ||
      j?.address?.county ||
      "Current Location"
    );
  } catch {
    return "Current Location";
  }
}

export function PredictionLocationPicker({ active, onChange }: PredictionLocationPickerProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<PickedLocation | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);

  const { data: saved = [] } = useQuery({
    queryKey: ["saved-locations-picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_locations")
        .select("name, latitude, longitude, is_primary")
        .order("is_primary", { ascending: false })
        .order("name");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const requestGps = () => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        const loc = { name, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setGpsLocation(loc);
        setGpsLoading(false);
        onChange(loc);
      },
      () => {
        setGpsDenied(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  };

  // Auto-load GPS if previously granted (silent)
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (status.state === "granted" && !gpsLocation && !gpsLoading) {
          requestGps();
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSame = (a: PickedLocation, b: { latitude: number; longitude: number }) =>
    Math.abs(a.latitude - b.latitude) < 0.001 && Math.abs(a.longitude - b.longitude) < 0.001;

  const chipClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium whitespace-nowrap border transition-all shrink-0",
      isActive
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-background/60 text-foreground border-border hover:border-primary/40"
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        Predicting for
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {/* Current location chip */}
        {gpsLocation ? (
          <button
            type="button"
            onClick={() => onChange(gpsLocation)}
            className={chipClass(isSame(active, gpsLocation))}
          >
            <Navigation className="w-3.5 h-3.5" />
            {gpsLocation.name}
          </button>
        ) : (
          <button
            type="button"
            onClick={requestGps}
            disabled={gpsLoading || gpsDenied}
            className={chipClass(false)}
            title={gpsDenied ? "Enable location in browser settings" : "Use current location"}
          >
            {gpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            {gpsDenied ? "Location off" : "Current"}
          </button>
        )}

        {saved.map((s: any) => {
          const loc: PickedLocation = {
            name: s.name,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
          };
          return (
            <button
              key={`${s.name}-${s.latitude}-${s.longitude}`}
              type="button"
              onClick={() => onChange(loc)}
              className={chipClass(isSame(active, loc))}
            >
              <MapPin className="w-3.5 h-3.5" />
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
