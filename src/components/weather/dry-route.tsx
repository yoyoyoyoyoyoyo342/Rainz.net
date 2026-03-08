import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Loader2, Umbrella, Clock, Route, Maximize2, Minimize2, Car, Bike, Footprints, Calendar, Navigation2, Square, Share2, CloudRain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useLazyMap } from '@/hooks/use-lazy-map';
import { DryRouteNavigation } from './dry-route-navigation';
import { DryWindows } from './dry-windows';
import { UmbrellaScore } from './umbrella-score';
import { RouteCarbonTracker } from './route-carbon-tracker';

interface DryRouteProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isImperial: boolean;
}

export interface RouteResult {
  distance: number;
  duration: number;
  rainScore: number;
  geometry: [number, number][];
  label: string;
  steps: RouteStep[];
  rainTimeline: { distance: number; rainProb: number }[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: { type: string; modifier?: string };
  geometry: [number, number][];
}

type TransportMode = 'driving' | 'cycling' | 'walking';

const TRANSPORT_MODES: { mode: TransportMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'driving', icon: <Car className="w-3.5 h-3.5" />, label: 'Drive' },
  { mode: 'cycling', icon: <Bike className="w-3.5 h-3.5" />, label: 'Bike' },
  { mode: 'walking', icon: <Footprints className="w-3.5 h-3.5" />, label: 'Walk' },
];

export function DryRoute({ latitude, longitude, locationName, isImperial }: DryRouteProps) {
  const { containerRef, isVisible } = useLazyMap('300px');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<'from' | 'to' | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bestRouteIdx, setBestRouteIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [departureTime, setDepartureTime] = useState<string>('');
  const [navigating, setNavigating] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const radarLayerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Lazy load leaflet
  useEffect(() => {
    if (!isVisible || leafletLoaded) return;
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet]) => {
      LRef.current = leaflet.default;
      setLeafletLoaded(true);
    });
  }, [isVisible, leafletLoaded]);

  const drawRoutes = useCallback((routeResults: RouteResult[], highlightIdx: number) => {
    const L = LRef.current;
    if (!mapInstance.current || !L) return;

    routeLayers.current.forEach(l => mapInstance.current!.removeLayer(l));
    routeLayers.current = [];

    const bounds = L.latLngBounds([]);

    routeResults.forEach((route, i) => {
      const isHighlight = i === highlightIdx;
      const color = route.rainScore < 30 ? 'hsl(142, 71%, 45%)' : route.rainScore < 60 ? 'hsl(48, 96%, 53%)' : 'hsl(0, 84%, 60%)';

      const line = L.polyline(route.geometry, {
        color: isHighlight ? color : 'hsl(215, 20%, 65%)',
        weight: isHighlight ? 5 : 3,
        opacity: isHighlight ? 0.9 : 0.4,
        dashArray: isHighlight ? undefined : '8 8',
      }).addTo(mapInstance.current!);

      routeLayers.current.push(line);
      route.geometry.forEach((p: [number, number]) => bounds.extend(p));
    });

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
  }, [fromCoords, toCoords]);

  // Init map when leaflet ready and container available
  const initMap = useCallback(() => {
    if (!leafletLoaded || !mapRef.current) return;
    // Destroy previous instance if exists
    if (mapInstance.current) {
      try { mapInstance.current.remove(); } catch {}
      mapInstance.current = null;
    }
    const L = LRef.current;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      scrollWheelZoom: !isFullscreen,
    }).setView([latitude, longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    mapInstance.current = map;
    radarLayerRef.current = null;

    // Re-draw routes if we have them
    if (routes.length > 0) {
      setTimeout(() => drawRoutes(routes, bestRouteIdx), 100);
    }
    // Re-apply radar if enabled
    if (showRadar) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ohwtbkudpkfbakynikyj';
      radarLayerRef.current = L.tileLayer(
        `https://${projectId}.supabase.co/functions/v1/owm-tile-proxy?layer=precipitation_new&z={z}&x={x}&y={y}`,
        { opacity: 0.5, maxZoom: 18 }
      ).addTo(map);
    }
  }, [leafletLoaded, latitude, longitude, routes, bestRouteIdx, showRadar, drawRoutes, isFullscreen]);

  // Initialize map when leaflet loads
  useEffect(() => {
    initMap();
    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
      }
    };
  }, [leafletLoaded, isFullscreen]);

  // Lock body scroll when fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isFullscreen]);

  // Re-init map when fullscreen toggles (DOM container changes)
  useEffect(() => {
    // Small delay to let the Dialog DOM mount/unmount
    const timer = setTimeout(() => {
      initMap();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);


  // Rain radar overlay toggle
  useEffect(() => {
    const L = LRef.current;
    if (!mapInstance.current || !L) return;

    if (showRadar && !radarLayerRef.current) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ohwtbkudpkfbakynikyj';
      radarLayerRef.current = L.tileLayer(
        `https://${projectId}.supabase.co/functions/v1/owm-tile-proxy?layer=precipitation_new&z={z}&x={x}&y={y}`,
        { opacity: 0.5, maxZoom: 18 }
      ).addTo(mapInstance.current);
    } else if (!showRadar && radarLayerRef.current) {
      mapInstance.current.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
  }, [showRadar]);

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

  const getRainScoreForRoute = async (geometry: [number, number][]): Promise<{ score: number; timeline: { distance: number; rainProb: number }[] }> => {
    const sampleCount = Math.min(8, geometry.length);
    const step = Math.max(1, Math.floor(geometry.length / sampleCount));
    const samples = Array.from({ length: sampleCount }, (_, i) => ({
      coord: geometry[Math.min(i * step, geometry.length - 1)],
      distanceFraction: i / (sampleCount - 1),
    }));

    // Determine forecast hour offset based on departure time
    let forecastStartHour = 0;
    if (departureTime) {
      const now = new Date();
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departure = new Date(now);
      departure.setHours(hours, minutes, 0, 0);
      if (departure < now) departure.setDate(departure.getDate() + 1);
      forecastStartHour = Math.max(0, Math.floor((departure.getTime() - now.getTime()) / 3600000));
    }

    let totalPrecipProb = 0;
    const timeline: { distance: number; rainProb: number }[] = [];

    for (const sample of samples) {
      const [lat, lon] = sample.coord;
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_hours=${forecastStartHour + 4}&timezone=auto`
        );
        const data = await res.json();
        const probs = data?.hourly?.precipitation_probability || [0];
        const relevantProbs = probs.slice(forecastStartHour, forecastStartHour + 3);
        const maxProb = Math.max(...relevantProbs, 0);
        totalPrecipProb += maxProb;
        timeline.push({ distance: sample.distanceFraction, rainProb: maxProb });
      } catch {
        timeline.push({ distance: sample.distanceFraction, rainProb: 0 });
      }
    }
    return { score: Math.round(totalPrecipProb / sampleCount), timeline };
  };

  const findRoutes = async () => {
    if (!fromCoords || !toCoords) return toast.error('Set both locations!');
    setLoading(true);

    try {
      const profile = transportMode === 'driving' ? 'car' : transportMode === 'cycling' ? 'bike' : 'foot';
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson&alternatives=3&steps=true`
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
          (c: [number, number]) => [c[1], c[0]]
        );

        const { score: rainScore, timeline: rainTimeline } = await getRainScoreForRoute(geometry);

        // Parse steps
        const steps: RouteStep[] = [];
        for (const leg of route.legs) {
          for (const s of leg.steps) {
            steps.push({
              instruction: s.maneuver?.modifier
                ? `${s.maneuver.type.replace(/-/g, ' ')} ${s.maneuver.modifier}`
                : s.maneuver?.type?.replace(/-/g, ' ') || 'Continue',
              distance: s.distance,
              duration: s.duration,
              maneuver: s.maneuver || { type: 'straight' },
              geometry: (s.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]]),
            });
          }
        }

        routeResults.push({
          distance: route.distance,
          duration: route.duration,
          rainScore,
          geometry,
          label: i === 0 ? 'Fastest' : `Alt ${i}`,
          steps,
          rainTimeline,
        });
      }

      routeResults.sort((a, b) => a.rainScore - b.rainScore);
      routeResults[0].label = '🌂 Driest';

      setRoutes(routeResults);
      setBestRouteIdx(0);
      drawRoutes(routeResults, 0);
    } catch (err) {
      toast.error('Failed to find routes');
    }
    setLoading(false);
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

  const startNavigation = () => {
    if (routes.length === 0) return;
    setNavigating(true);
    setIsFullscreen(true);
  };

  const stopNavigation = () => {
    setNavigating(false);
  };

  const shareRoute = async () => {
    const route = routes[bestRouteIdx];
    if (!route) return;
    const text = `🌂 DryRoute: ${fromQuery} → ${toQuery}\n☔ Rain: ${route.rainScore}% | ⏱ ${formatDuration(route.duration)} | 📏 ${formatDistance(route.distance)}\n\nPlan your dry route at rainz.net`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'DryRoute', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Route copied to clipboard!');
      }
    } catch { /* user cancelled */ }
  };

  const routeContent = (
    <div className="space-y-3">
      {/* Transport mode selector */}
      <div className="flex gap-1">
        {TRANSPORT_MODES.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setTransportMode(mode)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border transition-all ${
              transportMode === mode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/40'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Departure time */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="time"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          className="flex-1 text-xs bg-muted/30 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Leave now"
        />
        {departureTime && (
          <button onClick={() => setDepartureTime('')} className="text-xs text-muted-foreground hover:text-foreground">
            Now
          </button>
        )}
      </div>

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
          <div className="bg-background border border-border/50 rounded-lg shadow-lg max-h-32 overflow-y-auto z-50 relative">
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
          <div className="bg-background border border-border/50 rounded-lg shadow-lg max-h-32 overflow-y-auto z-50 relative">
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

      {/* Dry Windows - best time to leave */}
      {fromCoords && toCoords && routes.length > 0 && (
        <DryWindows
          fromCoords={fromCoords}
          toCoords={toCoords}
          routeGeometry={routes[bestRouteIdx]?.geometry || []}
          isImperial={isImperial}
        />
      )}

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} className={`w-full rounded-xl overflow-hidden border border-border/30 ${isFullscreen ? 'h-[50vh]' : 'h-56'}`} />
        <button
          onClick={() => setShowRadar(!showRadar)}
          className={`absolute top-2 right-2 z-[1000] flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
            showRadar
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background/80 text-muted-foreground border-border/50 hover:border-primary/40'
          }`}
        >
          <CloudRain className="w-3 h-3" />
          Radar
        </button>
      </div>

      {/* Rain timeline bar */}
      {routes.length > 0 && routes[bestRouteIdx]?.rainTimeline?.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">Rain along route</p>
          <div className="flex h-3 rounded-full overflow-hidden border border-border/30">
            {routes[bestRouteIdx].rainTimeline.map((segment, i) => (
              <div
                key={i}
                className="flex-1 transition-colors"
                style={{
                  backgroundColor: segment.rainProb < 30
                    ? 'hsl(142, 71%, 45%)'
                    : segment.rainProb < 60
                    ? 'hsl(48, 96%, 53%)'
                    : 'hsl(0, 84%, 60%)',
                  opacity: 0.7 + (segment.rainProb / 100) * 0.3,
                }}
                title={`${segment.rainProb}% rain`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>
      )}

      {/* Route results */}
      {routes.length > 0 && (
        <div className="space-y-1.5">
          {routes.map((route, i) => (
            <button
              key={i}
              onClick={() => { setBestRouteIdx(i); drawRoutes(routes, i); }}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all ${
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

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={startNavigation}
            >
              <Navigation2 className="w-3.5 h-3.5 mr-1.5" />
              Go
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={shareRoute}>
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Umbrella Score Badge */}
          <UmbrellaScore rainScore={routes[bestRouteIdx].rainScore} />

          {/* Carbon & Calorie Tracker */}
          <RouteCarbonTracker
            distanceMeters={routes[bestRouteIdx].distance}
            durationSeconds={routes[bestRouteIdx].duration}
            transportMode={transportMode}
            isImperial={isImperial}
          />
        </div>
      )}

      {/* Turn-by-turn navigation panel */}
      {navigating && routes[bestRouteIdx] && (
        <DryRouteNavigation
          route={routes[bestRouteIdx]}
          isImperial={isImperial}
          mapInstance={mapInstance.current}
          L={LRef.current}
          onStop={stopNavigation}
        />
      )}
    </div>
  );

  const cardContent = (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Rainz DryRoutes
          <button
            onClick={() => setIsFullscreen(true)}
            className="ml-auto p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isVisible ? routeContent : (
          <div className="w-full h-56 rounded-xl bg-muted/30 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div ref={containerRef} className="mb-4">
      {isFullscreen ? createPortal(
        <div 
          className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-200"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Rainz DryRoutes</span>
            </div>
            <button
              onClick={() => { setIsFullscreen(false); if (navigating) stopNavigation(); }}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 pb-8">
            {routeContent}
          </div>
        </div>,
        document.body
      ) : null}
      {cardContent}
    </div>
  );
}
