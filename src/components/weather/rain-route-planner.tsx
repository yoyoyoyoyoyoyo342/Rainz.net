import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Loader2, Umbrella, Clock, Route } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';

interface RainRoutePlannerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isImperial: boolean;
}

interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  rainScore: number; // 0-100 (0 = no rain, 100 = heavy rain)
  geometry: [number, number][];
  label: string;
}

export function RainRoutePlanner({ latitude, longitude, locationName, isImperial }: RainRoutePlannerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayers = useRef<L.Layer[]>([]);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<'from' | 'to' | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bestRouteIdx, setBestRouteIdx] = useState(0);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([latitude, longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [latitude, longitude]);

  const geocode = async (query: string) => {
    if (query.length < 3) return;
    try {
      const { data } = await supabase.functions.invoke('geocode-address', { body: { query } });
      setSearchResults(data?.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const selectLocation = (result: any, type: 'from' | 'to') => {
    const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    if (type === 'from') {
      setFromCoords(coords);
      setFromQuery(result.display_name.split(',').slice(0, 2).join(','));
    } else {
      setToCoords(coords);
      setToQuery(result.display_name.split(',').slice(0, 2).join(','));
    }
    setSearching(null);
    setSearchResults([]);
  };

  const useCurrentLocation = (type: 'from' | 'to') => {
    const coords: [number, number] = [latitude, longitude];
    if (type === 'from') {
      setFromCoords(coords);
      setFromQuery(locationName);
    } else {
      setToCoords(coords);
      setToQuery(locationName);
    }
  };

  // Fetch rain data for waypoints along a route
  const getRainScoreForRoute = async (geometry: [number, number][]): Promise<number> => {
    // Sample 5 points along the route
    const sampleCount = Math.min(5, geometry.length);
    const step = Math.max(1, Math.floor(geometry.length / sampleCount));
    const samples = Array.from({ length: sampleCount }, (_, i) => geometry[Math.min(i * step, geometry.length - 1)]);
    
    let totalPrecipProb = 0;
    for (const [lat, lon] of samples) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_hours=3&timezone=auto`
        );
        const data = await res.json();
        const maxProb = Math.max(...(data?.hourly?.precipitation_probability || [0]).slice(0, 3));
        totalPrecipProb += maxProb;
      } catch {
        // Skip failed samples
      }
    }
    return Math.round(totalPrecipProb / sampleCount);
  };

  const findRoutes = async () => {
    if (!fromCoords || !toCoords) return toast.error('Set both locations!');
    setLoading(true);
    
    try {
      // Fetch routes from OSRM (free, open source)
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson&alternatives=3`
      );
      const data = await res.json();
      
      if (!data.routes?.length) {
        toast.error('No routes found');
        setLoading(false);
        return;
      }

      const routeResults: RouteResult[] = [];
      
      for (let i = 0; i < data.routes.length; i++) {
        const route = data.routes[i];
        const geometry: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // GeoJSON is [lon, lat], Leaflet is [lat, lon]
        );
        
        const rainScore = await getRainScoreForRoute(geometry);
        
        routeResults.push({
          distance: route.distance,
          duration: route.duration,
          rainScore,
          geometry,
          label: i === 0 ? 'Fastest' : `Alternative ${i}`,
        });
      }

      // Sort by rain score (driest first)
      routeResults.sort((a, b) => a.rainScore - b.rainScore);
      routeResults[0].label = '🌂 Driest Route';
      
      setRoutes(routeResults);
      setBestRouteIdx(0);
      drawRoutes(routeResults, 0);
    } catch (err) {
      toast.error('Failed to find routes');
    }
    setLoading(false);
  };

  const drawRoutes = (routeResults: RouteResult[], highlightIdx: number) => {
    if (!mapInstance.current) return;
    
    // Clear existing
    routeLayers.current.forEach(l => mapInstance.current!.removeLayer(l));
    routeLayers.current = [];

    const bounds = L.latLngBounds([]);

    routeResults.forEach((route, i) => {
      const isHighlight = i === highlightIdx;
      const color = route.rainScore < 30 ? '#22c55e' : route.rainScore < 60 ? '#eab308' : '#ef4444';
      
      const line = L.polyline(route.geometry, {
        color: isHighlight ? color : '#94a3b8',
        weight: isHighlight ? 5 : 3,
        opacity: isHighlight ? 0.9 : 0.4,
        dashArray: isHighlight ? undefined : '8 8',
      }).addTo(mapInstance.current!);
      
      routeLayers.current.push(line);
      route.geometry.forEach(p => bounds.extend(p));
    });

    // Add markers
    if (fromCoords) {
      const startMarker = L.marker(fromCoords, {
        icon: L.divIcon({ html: '🟢', className: '', iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(mapInstance.current!);
      routeLayers.current.push(startMarker);
    }
    if (toCoords) {
      const endMarker = L.marker(toCoords, {
        icon: L.divIcon({ html: '🔴', className: '', iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(mapInstance.current!);
      routeLayers.current.push(endMarker);
    }

    mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const formatDistance = (meters: number) => {
    if (isImperial) return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Rain-Free Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* From input */}
        <div className="space-y-1">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => { setFromQuery(e.target.value); setSearching('from'); geocode(e.target.value); }}
                onFocus={() => setSearching('from')}
                placeholder="From..."
                className="w-full text-xs bg-muted/30 rounded-lg pl-7 pr-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="absolute left-2.5 top-2 text-xs">🟢</span>
            </div>
            <button onClick={() => useCurrentLocation('from')} className="text-xs px-2 py-1 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0">
              📍
            </button>
          </div>
          {searching === 'from' && searchResults.length > 0 && (
            <div className="bg-background border border-border/50 rounded-lg shadow-lg max-h-32 overflow-y-auto">
              {searchResults.map((r: any, i: number) => (
                <button key={i} onClick={() => selectLocation(r, 'from')}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-muted/50 truncate">
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* To input */}
        <div className="space-y-1">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={toQuery}
                onChange={(e) => { setToQuery(e.target.value); setSearching('to'); geocode(e.target.value); }}
                onFocus={() => setSearching('to')}
                placeholder="To..."
                className="w-full text-xs bg-muted/30 rounded-lg pl-7 pr-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="absolute left-2.5 top-2 text-xs">🔴</span>
            </div>
            <button onClick={() => useCurrentLocation('to')} className="text-xs px-2 py-1 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0">
              📍
            </button>
          </div>
          {searching === 'to' && searchResults.length > 0 && (
            <div className="bg-background border border-border/50 rounded-lg shadow-lg max-h-32 overflow-y-auto">
              {searchResults.map((r: any, i: number) => (
                <button key={i} onClick={() => selectLocation(r, 'to')}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-muted/50 truncate">
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={findRoutes} disabled={loading || !fromCoords || !toCoords} size="sm" className="w-full text-xs">
          {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing rain...</> : <><Route className="w-3.5 h-3.5 mr-1.5" /> Find Driest Route</>}
        </Button>

        {/* Map */}
        <div ref={mapRef} className="w-full h-48 rounded-xl overflow-hidden border border-border/30" />

        {/* Route results */}
        {routes.length > 0 && (
          <div className="space-y-1.5">
            {routes.map((route, i) => (
              <button
                key={i}
                onClick={() => { setBestRouteIdx(i); drawRoutes(routes, i); }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                  i === bestRouteIdx
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/30 border border-border/20 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{route.label}</span>
                  <span className="text-muted-foreground">{formatDistance(route.distance)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(route.duration)}
                  </span>
                  <span className={`flex items-center gap-1 font-bold ${
                    route.rainScore < 30 ? 'text-green-500' : route.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    <Umbrella className="w-3 h-3" /> {route.rainScore}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
