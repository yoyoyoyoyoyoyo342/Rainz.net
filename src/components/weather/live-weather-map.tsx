import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Droplets, Sun, Cloud, Snowflake, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLazyMap } from '@/hooks/use-lazy-map';

interface LiveWeatherMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  userId?: string;
}

const WEATHER_PINS = [
  { emoji: '☀️', label: 'Sunny', icon: Sun },
  { emoji: '🌧️', label: 'Rainy', icon: Droplets },
  { emoji: '☁️', label: 'Cloudy', icon: Cloud },
  { emoji: '❄️', label: 'Snowy', icon: Snowflake },
  { emoji: '⛈️', label: 'Storm', icon: Zap },
  { emoji: '🌈', label: 'Rainbow', icon: Sun },
];

export function LiveWeatherMap({ latitude, longitude, locationName, userId }: LiveWeatherMapProps) {
  const { containerRef, isVisible } = useLazyMap('200px');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [showPinSelect, setShowPinSelect] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const LRef = useRef<any>(null);
  const queryClient = useQueryClient();

  // Lazy load leaflet
  useEffect(() => {
    if (!isVisible || leafletLoaded) return;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([leaflet]) => {
      LRef.current = leaflet.default;
      setLeafletLoaded(true);
    });
  }, [isVisible, leafletLoaded]);

  const { data: reactions = [] } = useQuery({
    queryKey: ['weather-reactions-map', latitude, longitude],
    queryFn: async () => {
      const { data } = await supabase
        .from('weather_reactions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance.current) return;
    const L = LRef.current;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    }).setView([latitude, longitude], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [leafletLoaded, latitude, longitude]);

  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) layer.remove();
    });

    reactions.forEach((r: any) => {
      if (r.latitude && r.longitude) {
        const icon = L.divIcon({
          html: `<div style="font-size:24px;text-align:center;line-height:1">${r.emoji}</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([r.latitude, r.longitude], { icon })
          .bindPopup(`<b>${r.emoji}</b> ${r.message}<br/><small>${r.location_name} · ${new Date(r.created_at).toLocaleTimeString()}</small>`)
          .addTo(mapInstance.current!);
      }
    });
  }, [reactions]);

  const dropPin = async (emoji: string, label: string) => {
    if (!userId) return toast.error('Sign in to drop pins!');
    
    await supabase.from('weather_reactions').insert({
      user_id: userId,
      emoji,
      message: `Reporting ${label} weather here!`,
      latitude,
      longitude,
      location_name: locationName,
    });
    
    setShowPinSelect(false);
    setSelectedPin(null);
    queryClient.invalidateQueries({ queryKey: ['weather-reactions-map'] });
    toast.success(`${emoji} Pin dropped!`);
  };

  return (
    <div ref={containerRef}>
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Live Weather Map
            <span className="text-xs text-muted-foreground ml-auto">{reactions.length} pins</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isVisible && leafletLoaded ? (
            <div ref={mapRef} className="w-full h-48 rounded-xl overflow-hidden border border-border/30" />
          ) : (
            <div className="w-full h-48 rounded-xl bg-muted/30 flex items-center justify-center border border-border/30">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {showPinSelect ? (
            <div className="flex flex-wrap gap-1.5">
              {WEATHER_PINS.map((pin) => (
                <button
                  key={pin.emoji}
                  onClick={() => dropPin(pin.emoji, pin.label)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <span>{pin.emoji}</span> {pin.label}
                </button>
              ))}
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowPinSelect(true)} className="w-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Drop Weather Pin
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
