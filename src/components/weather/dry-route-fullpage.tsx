import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Navigation, MapPin, Loader2, Umbrella, Clock, Route, Car, Bike, Footprints,
  Calendar, Navigation2, Square, Share2, CloudRain, Camera, Play, Pause, CircleStop,
  Pencil, Trash2, Timer, Zap, Activity, Check, X, Mountain, Image, ArrowLeft,
  Search, Layers, Crosshair, Coffee, ShoppingBag, Pill, Fuel, Building, UtensilsCrossed,
  Bus, Star, ExternalLink, Phone,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { DryRouteNavigation } from './dry-route-navigation';
import { DryRouteAR } from './dry-route-ar';
import { DryWindows } from './dry-windows';
import { UmbrellaScore } from './umbrella-score';
import { RouteCarbonTracker } from './route-carbon-tracker';
import { DryRouteBottomSheet } from './dry-route-bottom-sheet';
import type { RouteResult, RouteStep } from './dry-route';

interface DryRouteFullPageProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isImperial: boolean;
}

type TransportMode = 'driving' | 'cycling' | 'walking' | 'running' | 'transit';
type AppMode = 'route' | 'track' | 'create-route';
type TrackingState = 'idle' | 'recording' | 'paused';

interface SplitTime { km: number; elapsed: number; pace: number; }
interface ElevationPoint { distance: number; elevation: number; }
interface TrackSummary {
  distance: number; duration: number; avgPace: number; points: [number, number][];
  startTime: number; endTime: number; splits: SplitTime[]; elevationData: ElevationPoint[];
  elevationGain: number; elevationLoss: number;
}
interface DrawPoint { lat: number; lng: number; type: 'start' | 'end' | 'waypoint'; }

interface POI {
  id: number; name: string; type: string;
  lat: number; lon: number; address: string | null;
  phone: string | null; website: string | null; opening_hours: string | null;
}

const ROUTE_TRANSPORT_MODES: { mode: TransportMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'driving', icon: <Car className="w-4 h-4" />, label: 'Drive' },
  { mode: 'transit', icon: <Bus className="w-4 h-4" />, label: 'Transit' },
  { mode: 'cycling', icon: <Bike className="w-4 h-4" />, label: 'Bike' },
  { mode: 'walking', icon: <Footprints className="w-4 h-4" />, label: 'Walk' },
];

const TRACK_TRANSPORT_MODES: { mode: TransportMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'cycling', icon: <Bike className="w-4 h-4" />, label: 'Bike' },
  { mode: 'running', icon: <Zap className="w-4 h-4" />, label: 'Run' },
  { mode: 'walking', icon: <Footprints className="w-4 h-4" />, label: 'Walk' },
];

const POI_CATEGORIES = [
  { key: 'restaurant', label: 'Restaurants', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
  { key: 'cafe', label: 'Coffee', icon: <Coffee className="w-3.5 h-3.5" /> },
  { key: 'shop', label: 'Shopping', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { key: 'pharmacy', label: 'Pharmacy', icon: <Pill className="w-3.5 h-3.5" /> },
  { key: 'fuel', label: 'Fuel', icon: <Fuel className="w-3.5 h-3.5" /> },
  { key: 'supermarket', label: 'Grocery', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { key: 'hotel', label: 'Hotels', icon: <Building className="w-3.5 h-3.5" /> },
];

const APP_MODES: { mode: AppMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'route', icon: <Route className="w-4 h-4" />, label: 'Route' },
  { mode: 'track', icon: <Activity className="w-4 h-4" />, label: 'Track' },
  { mode: 'create-route', icon: <Pencil className="w-4 h-4" />, label: 'Draw' },
];

const getOsrmProfile = (mode: TransportMode) => {
  if (mode === 'driving') return 'car';
  if (mode === 'cycling') return 'bike';
  return 'foot';
};

const getCaloriesPerKm = (mode: TransportMode) => {
  switch (mode) { case 'running': return 80; case 'walking': return 65; case 'cycling': return 30; default: return 0; }
};

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function DryRouteFullPage({ latitude, longitude, locationName, isImperial }: DryRouteFullPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const radarLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const poiMarkersRef = useRef<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Route state
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<'from' | 'to' | null>(null);
  const [routeSearchResults, setRouteSearchResults] = useState<any[]>([]);
  const [bestRouteIdx, setBestRouteIdx] = useState(0);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [departureTime, setDepartureTime] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('route');
  const [isDark, setIsDark] = useState(false);

  // POI state
  const [activePOICategory, setActivePOICategory] = useState<string | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [initialPoisLoaded, setInitialPoisLoaded] = useState(false);

  // Track mode state
  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [trackDistance, setTrackDistance] = useState(0);
  const [trackStartTime, setTrackStartTime] = useState<number | null>(null);
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [trackSummary, setTrackSummary] = useState<TrackSummary | null>(null);
  const trackPolylineRef = useRef<any>(null);
  const trackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedElapsedRef = useRef(0);
  const splitTimesRef = useRef<SplitTime[]>([]);
  const lastSplitKmRef = useRef(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const lastMovementTimeRef = useRef<number>(Date.now());
  const lastMovementPosRef = useRef<[number, number] | null>(null);

  // Draw mode state
  const [drawRoutePoints, setDrawRoutePoints] = useState<DrawPoint[]>([]);
  const drawRoutePointsRef = useRef<DrawPoint[]>([]);
  const [drawDistance, setDrawDistance] = useState(0);
  useEffect(() => { drawRoutePointsRef.current = drawRoutePoints; }, [drawRoutePoints]);
  const [currentPointType, setCurrentPointType] = useState<'start' | 'waypoint' | 'end'>('start');
  const [drawnRoute, setDrawnRoute] = useState<RouteResult | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const drawMarkersRef = useRef<any[]>([]);
  const drawLinesRef = useRef<any[]>([]);

  // Bottom sheet
  const [sheetSnap, setSheetSnap] = useState(1);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load leaflet
  useEffect(() => {
    if (leafletLoaded) return;
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet]) => {
      LRef.current = leaflet.default;
      setLeafletLoaded(true);
    });
  }, [leafletLoaded]);

  const drawRoutesFn = useCallback((routeResults: RouteResult[], highlightIdx: number) => {
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
        weight: isHighlight ? 6 : 3,
        opacity: isHighlight ? 0.9 : 0.4,
        dashArray: isHighlight ? undefined : '8 8',
      }).addTo(mapInstance.current!);
      routeLayers.current.push(line);
      route.geometry.forEach((p: [number, number]) => bounds.extend(p));
    });
    if (fromCoords) {
      const m = L.marker(fromCoords, { icon: L.divIcon({ html: '<div style="width:12px;height:12px;border-radius:50%;background:hsl(142,71%,45%);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(mapInstance.current!);
      routeLayers.current.push(m);
    }
    if (toCoords) {
      const m = L.marker(toCoords, { icon: L.divIcon({ html: '<div style="width:12px;height:12px;border-radius:50%;background:hsl(0,84%,60%);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(mapInstance.current!);
      routeLayers.current.push(m);
    }
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
  }, [fromCoords, toCoords]);

  // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    if (mapInstance.current) {
      try { mapInstance.current.remove(); } catch {} 
      mapInstance.current = null;
    }
    const L = LRef.current;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    }).setView([latitude, longitude], 14);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    mapInstance.current = map;

    if (routes.length > 0) {
      setTimeout(() => drawRoutesFn(routes, bestRouteIdx), 100);
    }

    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [leafletLoaded, isDark]);

  // Watch user position
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(newPos);
        if (trackingState === 'recording') {
          if (lastMovementPosRef.current) {
            const moveDist = haversineDistance(lastMovementPosRef.current, newPos);
            if (moveDist > 10) {
              lastMovementTimeRef.current = Date.now();
              lastMovementPosRef.current = newPos;
              if (autoPaused) setAutoPaused(false);
            }
          } else {
            lastMovementPosRef.current = newPos;
            lastMovementTimeRef.current = Date.now();
          }
          setTrackPoints(prev => {
            const updated = [...prev, newPos];
            if (prev.length > 0) {
              const dist = haversineDistance(prev[prev.length - 1], newPos);
              if (dist > 2) {
                setTrackDistance(d => {
                  const newDist = d + dist;
                  const currentKm = Math.floor(newDist / 1000);
                  if (currentKm > lastSplitKmRef.current && trackStartTime) {
                    const elapsed = pausedElapsedRef.current + (Date.now() - trackStartTime) / 1000;
                    const prevSplit = splitTimesRef.current[splitTimesRef.current.length - 1];
                    const prevElapsed = prevSplit ? prevSplit.elapsed : 0;
                    splitTimesRef.current.push({ km: currentKm, elapsed, pace: elapsed - prevElapsed });
                    lastSplitKmRef.current = currentKm;
                  }
                  return newDist;
                });
              }
            }
            return updated;
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingState, autoPaused, trackStartTime]);

  // Blue user marker with smooth glide
  useEffect(() => {
    if (!userPosition || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    if (userMarkerRef.current) {
      const start = userMarkerRef.current.getLatLng();
      const end = L.latLng(userPosition);
      const duration = 800;
      const startTime = performance.now();
      const anim = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        userMarkerRef.current?.setLatLng([start.lat + (end.lat - start.lat) * ease, start.lng + (end.lng - start.lng) * ease]);
        if (t < 1) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    } else {
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(userPosition, { icon, zIndexOffset: 1000 }).addTo(mapInstance.current);
    }
  }, [userPosition]);

  // Track polyline
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    if (trackPolylineRef.current) { mapInstance.current.removeLayer(trackPolylineRef.current); trackPolylineRef.current = null; }
    if (trackPoints.length > 1) {
      trackPolylineRef.current = L.polyline(trackPoints, { color: 'hsl(217, 91%, 60%)', weight: 4, opacity: 0.85 }).addTo(mapInstance.current);
      if (trackingState === 'recording') {
        mapInstance.current.setView(trackPoints[trackPoints.length - 1], mapInstance.current.getZoom(), { animate: true });
      }
    }
  }, [trackPoints, trackingState]);

  // Track timer
  useEffect(() => {
    if (trackingState === 'recording') {
      if (!trackStartTime) setTrackStartTime(Date.now());
      trackTimerRef.current = setInterval(() => {
        setTrackElapsed(pausedElapsedRef.current + (Date.now() - (trackStartTime || Date.now())) / 1000);
      }, 1000);
    } else {
      if (trackTimerRef.current) { clearInterval(trackTimerRef.current); trackTimerRef.current = null; }
    }
    return () => { if (trackTimerRef.current) clearInterval(trackTimerRef.current); };
  }, [trackingState, trackStartTime]);

  // Auto-pause detection
  useEffect(() => {
    if (trackingState !== 'recording') return;
    const interval = setInterval(() => {
      if (Date.now() - lastMovementTimeRef.current > 15000 && !autoPaused) setAutoPaused(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [trackingState, autoPaused]);

  // Draw mode click handler
  useEffect(() => {
    if (!mapInstance.current || !LRef.current || appMode !== 'create-route') return;
    const map = mapInstance.current;
    const container = map.getContainer();
    const onClick = (e: any) => {
      const pt = e.latlng;
      const newPoint: DrawPoint = { lat: pt.lat, lng: pt.lng, type: currentPointType };
      if (currentPointType === 'start' && drawRoutePoints.some(p => p.type === 'start')) {
        toast.error('Only one start point'); return;
      }
      if (drawRoutePoints.some(p => p.type === 'end')) {
        toast.error('End must be last'); return;
      }
      const currentPoints = drawRoutePointsRef.current;
      if (currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        setDrawDistance(d => d + haversineDistance([last.lat, last.lng], [newPoint.lat, newPoint.lng]));
      }
      const updated = [...currentPoints, newPoint];
      drawRoutePointsRef.current = updated;
      setDrawRoutePoints(updated);
    };
    map.on('click', onClick);
    container.style.cursor = 'crosshair';
    return () => { map.off('click', onClick); container.style.cursor = ''; };
  }, [appMode, drawRoutePoints, currentPointType]);

  // Render draw markers
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;
    drawMarkersRef.current.forEach(m => map.removeLayer(m));
    drawMarkersRef.current = [];
    drawLinesRef.current.forEach(l => map.removeLayer(l));
    drawLinesRef.current = [];
    if (drawRoutePoints.length === 0) return;
    drawRoutePoints.forEach((point, idx) => {
      let emoji = '⚪';
      if (point.type === 'start') emoji = '🟢';
      else if (point.type === 'end') emoji = '🏁';
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({ html: `<div style="font-size:24px">${emoji}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
      }).addTo(map);
      marker.on('click', (e: any) => { e.originalEvent.stopPropagation(); setDrawRoutePoints(prev => prev.filter((_, i) => i !== idx)); });
      drawMarkersRef.current.push(marker);
    });
    if (drawnRoute && drawnRoute.geometry) {
      const line = L.polyline(drawnRoute.geometry, { color: 'hsl(142, 71%, 45%)', weight: 4, opacity: 0.8 }).addTo(map);
      drawLinesRef.current.push(line);
    } else if (drawRoutePoints.length > 1) {
      const line = L.polyline(drawRoutePoints.map(p => [p.lat, p.lng]), { color: 'hsl(280, 80%, 55%)', weight: 3, opacity: 0.5, dashArray: '6 6' }).addTo(map);
      drawLinesRef.current.push(line);
    }
  }, [drawRoutePoints, drawnRoute]);

  // Rain radar
  useEffect(() => {
    const L = LRef.current;
    if (!mapInstance.current || !L) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ohwtbkudpkfbakynikyj';
    if (showRadar && !radarLayerRef.current) {
      radarLayerRef.current = L.tileLayer(
        `https://${projectId}.supabase.co/functions/v1/owm-tile-proxy?layer=precipitation_new&z={z}&x={x}&y={y}`,
        { opacity: 0.5, minZoom: 0, maxZoom: 18, zIndex: 500 }
      ).addTo(mapInstance.current);
    } else if (!showRadar && radarLayerRef.current) {
      mapInstance.current.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
  }, [showRadar]);

  // POI markers
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    poiMarkersRef.current.forEach(m => mapInstance.current!.removeLayer(m));
    poiMarkersRef.current = [];
    pois.forEach(poi => {
      const emoji = poi.type === 'restaurant' || poi.type === 'fast_food' ? '🍽️'
        : poi.type === 'cafe' ? '☕'
        : poi.type === 'pharmacy' ? '💊'
        : poi.type === 'fuel' ? '⛽'
        : poi.type === 'supermarket' ? '🛒'
        : poi.type === 'hotel' ? '🏨'
        : '🏪';
      const marker = L.marker([poi.lat, poi.lon], {
        icon: L.divIcon({
          html: `<div style="background:hsl(var(--background));border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid hsl(var(--border))">${emoji}</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(mapInstance.current!);
      marker.on('click', () => {
        setSelectedPOI(poi);
        setToCoords([poi.lat, poi.lon]);
        setToQuery(poi.name);
        mapInstance.current?.setView([poi.lat, poi.lon], 16, { animate: true });
      });
      poiMarkersRef.current.push(marker);
    });
  }, [pois]);

  // Geocode
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocode = useCallback((query: string, target: 'search' | 'route') => {
    if (query.length < 3) return;
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('geocode-address', { body: { query } });
        if (target === 'search') setSearchResults(data?.results || []);
        else setRouteSearchResults(data?.results || []);
      } catch { 
        if (target === 'search') setSearchResults([]);
        else setRouteSearchResults([]);
      }
    }, 400);
  }, []);

  const selectSearchResult = (result: any) => {
    const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    mapInstance.current?.setView(coords, 15, { animate: true });
    setSearchFocused(false);
    const name = result.display_name.split(',').slice(0, 2).join(',');
    setSearchQuery(name);
    setSearchResults([]);
    setToCoords(coords);
    setToQuery(name);
    setSelectedPOI({
      id: 0, name, type: result.type || 'place',
      lat: coords[0], lon: coords[1],
      address: result.display_name || null,
      phone: null, website: null, opening_hours: null,
    });
  };

  const selectRouteLocation = (result: any, type: 'from' | 'to') => {
    const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    if (type === 'from') { setFromCoords(coords); setFromQuery(result.display_name.split(',').slice(0, 2).join(',')); }
    else { setToCoords(coords); setToQuery(result.display_name.split(',').slice(0, 2).join(',')); }
    setSearching(null);
    setRouteSearchResults([]);
  };

  const useCurrentLocation = (type: 'from' | 'to') => {
    const coords: [number, number] = [latitude, longitude];
    if (type === 'from') { setFromCoords(coords); setFromQuery(locationName); }
    else { setToCoords(coords); setToQuery(locationName); }
  };

  const centerOnUser = () => {
    if (userPosition && mapInstance.current) mapInstance.current.setView(userPosition, 16, { animate: true });
    else if (mapInstance.current) mapInstance.current.setView([latitude, longitude], 14, { animate: true });
  };

  // POI search
  const searchPOIs = async (category: string) => {
    if (activePOICategory === category) {
      setActivePOICategory(null);
      loadAllPOIs(true);
      return;
    }
    setActivePOICategory(category);
    setPoisLoading(true);
    try {
      const center = userPosition || [latitude, longitude];
      const { data, error } = await supabase.functions.invoke('search-nearby-pois', {
        body: { lat: center[0], lon: center[1], category, radius: 1500 },
      });
      if (error) throw error;
      setPois(data?.pois || []);
    } catch {
      toast.error('Failed to load nearby places');
      setPois([]);
    }
    setPoisLoading(false);
  };

  // Load all POIs on init
  const loadAllPOIs = useCallback(async (force = false) => {
    if (initialPoisLoaded && !force) return;
    const center = userPosition || [latitude, longitude];
    const categories = ['restaurant', 'cafe', 'shop', 'pharmacy', 'supermarket'];
    const allPois: POI[] = [];
    try {
      const results = await Promise.allSettled(
        categories.map(cat =>
          supabase.functions.invoke('search-nearby-pois', {
            body: { lat: center[0], lon: center[1], category: cat, radius: 1000 },
          })
        )
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.data?.pois) {
          allPois.push(...r.value.data.pois);
        }
      });
      setPois(allPois);
      setInitialPoisLoaded(true);
    } catch {}
  }, [latitude, longitude, userPosition, initialPoisLoaded]);

  // Auto-load POIs when map is ready
  useEffect(() => {
    if (leafletLoaded && mapInstance.current && !initialPoisLoaded) {
      loadAllPOIs();
    }
  }, [leafletLoaded, loadAllPOIs, initialPoisLoaded]);

  // Route finding
  const getRainScoreForRoute = async (geometry: [number, number][]): Promise<{ score: number; timeline: { distance: number; rainProb: number }[] }> => {
    const sampleCount = Math.min(8, geometry.length);
    const step = Math.max(1, Math.floor(geometry.length / sampleCount));
    const samples = Array.from({ length: sampleCount }, (_, i) => ({
      coord: geometry[Math.min(i * step, geometry.length - 1)],
      distanceFraction: i / (sampleCount - 1),
    }));
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
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_hours=${forecastStartHour + 4}&timezone=auto`);
        const data = await res.json();
        const probs = data?.hourly?.precipitation_probability || [0];
        const relevantProbs = probs.slice(forecastStartHour, forecastStartHour + 3);
        const maxProb = Math.max(...relevantProbs, 0);
        totalPrecipProb += maxProb;
        timeline.push({ distance: sample.distanceFraction, rainProb: maxProb });
      } catch { timeline.push({ distance: sample.distanceFraction, rainProb: 0 }); }
    }
    return { score: Math.round(totalPrecipProb / sampleCount), timeline };
  };

  const findRoutes = async (customFrom?: [number, number], customTo?: [number, number]) => {
    const from = customFrom || fromCoords;
    const to = customTo || toCoords;
    if (!from || !to) return toast.error('Set both locations!');
    if (customFrom) { setFromCoords(customFrom); setFromQuery('Current Location'); }
    if (customTo) setToCoords(customTo);
    setLoading(true);
    try {
      const profile = getOsrmProfile(transportMode);
      const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=3&steps=true`);
      const data = await res.json();
      if (!data.routes?.length) { toast.error('No routes found'); setLoading(false); return; }
      const routeResults: RouteResult[] = [];
      for (let i = 0; i < data.routes.length; i++) {
        const route = data.routes[i];
        const geometry: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const { score: rainScore, timeline: rainTimeline } = await getRainScoreForRoute(geometry);
        const steps: RouteStep[] = [];
        for (const leg of route.legs) {
          for (const s of leg.steps) {
            steps.push({
              instruction: s.maneuver?.modifier ? `${s.maneuver.type.replace(/-/g, ' ')} ${s.maneuver.modifier}` : s.maneuver?.type?.replace(/-/g, ' ') || 'Continue',
              distance: s.distance, duration: s.duration,
              maneuver: s.maneuver || { type: 'straight' },
              geometry: (s.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]]),
            });
          }
        }
        routeResults.push({ distance: route.distance, duration: route.duration, rainScore, geometry, label: i === 0 ? 'Fastest' : `Alt ${i}`, steps, rainTimeline });
      }
      routeResults.sort((a, b) => a.rainScore - b.rainScore);
      routeResults[0].label = '🌂 Driest';
      setRoutes(routeResults);
      setBestRouteIdx(0);
      drawRoutesFn(routeResults, 0);
    } catch { toast.error('Failed to find routes'); }
    setLoading(false);
  };

  const finalizeDrawnRoute = async () => {
    if (drawRoutePoints.length < 2) { toast.error('Need at least 2 points'); return; }
    if (!drawRoutePoints.some(p => p.type === 'start') || !drawRoutePoints.some(p => p.type === 'end')) {
      toast.error('Need start and end points'); return;
    }
    setDrawLoading(true);
    try {
      const profile = getOsrmProfile(transportMode);
      const coordsStr = drawRoutePoints.map(p => `${p.lng},${p.lat}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=true`);
      const data = await res.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        const geometry: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const { score: rainScore, timeline: rainTimeline } = await getRainScoreForRoute(geometry);
        const steps: RouteStep[] = [];
        for (const leg of route.legs) {
          for (const s of (leg.steps || [])) {
            steps.push({
              instruction: s.maneuver?.modifier ? `${s.maneuver.type.replace(/-/g, ' ')} ${s.maneuver.modifier}` : s.maneuver?.type?.replace(/-/g, ' ') || 'Continue',
              distance: s.distance, duration: s.duration,
              maneuver: s.maneuver || { type: 'straight' },
              geometry: (s.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]]),
            });
          }
        }
        const result: RouteResult = { distance: route.distance, duration: route.duration, rainScore, geometry, label: '✏️ Drawn Route', steps, rainTimeline };
        setDrawnRoute(result);
        setDrawDistance(route.distance);
        toast.success('Route created!');
      } else { toast.error('Could not create route'); }
    } catch { toast.error('Failed to create route'); }
    setDrawLoading(false);
  };

  // Format helpers
  const formatDuration = (s: number) => { const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m} min`; };
  const formatDistance = (m: number) => isImperial ? `${(m / 1609.34).toFixed(1)} mi` : `${(m / 1000).toFixed(1)} km`;
  const formatElapsed = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`; };
  const formatPace = (sPerKm: number) => { if (!isFinite(sPerKm) || sPerKm <= 0) return '--:--'; const m = Math.floor(sPerKm / 60); const s = Math.floor(sPerKm % 60); return `${m}:${s.toString().padStart(2, '0')}${isImperial ? '/mi' : '/km'}`; };

  // Track controls
  const startTracking = () => {
    setTrackPoints([]); setTrackDistance(0); setTrackElapsed(0); setTrackSummary(null);
    pausedElapsedRef.current = 0; splitTimesRef.current = []; lastSplitKmRef.current = 0;
    setAutoPaused(false); lastMovementPosRef.current = null; lastMovementTimeRef.current = Date.now();
    setTrackStartTime(Date.now()); setTrackingState('recording');
    toast.success('Activity started! 🏃');
  };
  const pauseTracking = () => { pausedElapsedRef.current = trackElapsed; setTrackingState('paused'); };
  const resumeTracking = () => { setTrackStartTime(Date.now()); setTrackingState('recording'); };

  const fetchElevation = async (points: [number, number][]): Promise<{ data: ElevationPoint[]; gain: number; loss: number }> => {
    try {
      const sampleCount = Math.min(20, points.length);
      const step = Math.max(1, Math.floor(points.length / sampleCount));
      const sampled = Array.from({ length: sampleCount }, (_, i) => points[Math.min(i * step, points.length - 1)]);
      const lats = sampled.map(p => p[0]).join(',');
      const lons = sampled.map(p => p[1]).join(',');
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
      const json = await res.json();
      const elevations: number[] = json.elevation || [];
      let totalDist = 0; const data: ElevationPoint[] = []; let gain = 0, loss = 0;
      for (let i = 0; i < sampled.length; i++) {
        if (i > 0) totalDist += haversineDistance(sampled[i - 1], sampled[i]) / 1000;
        data.push({ distance: totalDist, elevation: elevations[i] || 0 });
        if (i > 0) { const diff = (elevations[i] || 0) - (elevations[i - 1] || 0); if (diff > 0) gain += diff; else loss += Math.abs(diff); }
      }
      return { data, gain: Math.round(gain), loss: Math.round(loss) };
    } catch { return { data: [], gain: 0, loss: 0 }; }
  };

  const stopTracking = async () => {
    setTrackingState('idle');
    const { data: elevationData, gain: elevationGain, loss: elevationLoss } = await fetchElevation(trackPoints);
    setTrackSummary({
      distance: trackDistance, duration: trackElapsed,
      avgPace: trackDistance > 0 ? trackElapsed / (trackDistance / 1000) : 0,
      points: trackPoints, startTime: trackStartTime || Date.now(), endTime: Date.now(),
      splits: splitTimesRef.current, elevationData, elevationGain, elevationLoss,
    });
    toast.success('Activity saved! 🎉');
  };

  // Re-fetch routes on transport mode change
  const prevTransportRef = useRef(transportMode);
  useEffect(() => {
    if (prevTransportRef.current !== transportMode && routes.length > 0 && fromCoords && toCoords) {
      prevTransportRef.current = transportMode;
      findRoutes();
    } else { prevTransportRef.current = transportMode; }
  }, [transportMode]);

  // ==================== RENDER ====================

  const sheetHeader = (
    <div className="space-y-2">
      {/* Mode switcher */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/30">
        {APP_MODES.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => {
              setAppMode(mode);
              if (mode !== 'create-route') { setDrawRoutePoints([]); setDrawnRoute(null); }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg transition-all font-medium ${
              appMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Loading overlay while leaflet loads */}
      {!leafletLoaded && (
        <div className="absolute inset-0 z-[2000] bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      {/* Full-screen map */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Floating back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-[1100] w-10 h-10 rounded-full bg-background/90 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-lg hover:bg-background transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      {/* Floating search bar */}
      <div className="absolute top-4 left-16 right-4 z-[1100]">
        <div className="relative">
          <div className="flex items-center bg-background/90 backdrop-blur-md rounded-full border border-border/40 shadow-lg px-4 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); geocode(e.target.value, 'search'); }}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search places..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchFocused(false); }} className="ml-1">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Search results dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-background/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
              {searchResults.map((r: any, i: number) => (
                <button
                  key={i}
                  onClick={() => selectSearchResult(r)}
                  className="w-full text-left text-sm px-4 py-3 hover:bg-muted/30 flex items-center gap-3 border-b border-border/20 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category chips row */}
      <div className="absolute top-[72px] left-0 right-0 z-[1100] px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {POI_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => searchPOIs(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-sm ${
                activePOICategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background/90 backdrop-blur-md border border-border/40 text-foreground hover:bg-background'
              }`}
            >
              {cat.icon}
              {cat.label}
              {poisLoading && activePOICategory === cat.key && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          ))}
        </div>
      </div>

      {/* Floating action buttons (bottom-right, above bottom sheet) */}
      <div className="absolute bottom-[15vh] right-4 z-[1100] flex flex-col gap-2">
        <button
          onClick={() => setShowRadar(!showRadar)}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all ${
            showRadar ? 'bg-primary text-primary-foreground' : 'bg-background/90 backdrop-blur-md border border-border/40 text-foreground'
          }`}
        >
          <Layers className="w-5 h-5" />
        </button>
        <button
          onClick={centerOnUser}
          className="w-11 h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-lg text-foreground hover:bg-background"
        >
          <Crosshair className="w-5 h-5" />
        </button>
        {routes.length > 0 && (
          <button
            onClick={() => { setNavigating(true); }}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg text-primary-foreground"
          >
            <Navigation2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Sheet */}
      <DryRouteBottomSheet
        header={sheetHeader}
        snapPoints={[12, 45, 90]}
        defaultSnap={1}
        onSnapChange={setSheetSnap}
      >
        <div className="space-y-3 pb-4">
          {/* ROUTE MODE */}
          {appMode === 'route' && (
            <>
              {/* Transport mode */}
              <div className="flex gap-1.5">
                {ROUTE_TRANSPORT_MODES.map(({ mode, icon, label }) => (
                  <button key={mode} onClick={() => setTransportMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-2.5 rounded-xl border transition-all font-medium ${
                      transportMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 text-muted-foreground border-border/30 hover:border-primary/40'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Selected POI details */}
              {selectedPOI && routes.length === 0 && (
                <div className="space-y-3">
                  <div className="bg-muted/20 rounded-xl p-4 border border-border/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{selectedPOI.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{selectedPOI.type.replace(/_/g, ' ')}</p>
                      </div>
                      <button onClick={() => { setSelectedPOI(null); setToCoords(null); setToQuery(''); }} className="p-1 hover:bg-muted/30 rounded-lg shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    {selectedPOI.address && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{selectedPOI.address}</span>
                      </div>
                    )}
                    {selectedPOI.opening_hours && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedPOI.opening_hours}</span>
                      </div>
                    )}
                    {selectedPOI.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <a href={`tel:${selectedPOI.phone}`} className="text-primary">{selectedPOI.phone}</a>
                      </div>
                    )}
                    {selectedPOI.website && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <a href={selectedPOI.website} target="_blank" rel="noopener noreferrer" className="text-primary truncate">{selectedPOI.website.replace(/^https?:\/\//, '')}</a>
                      </div>
                    )}
                  </div>
                  <Button onClick={() => {
                    const from: [number, number] = userPosition || [latitude, longitude];
                    setFromCoords(from);
                    setFromQuery('Current Location');
                    findRoutes(from, toCoords || undefined);
                  }} disabled={loading} size="sm" className="w-full">
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finding driest route...</> : <><Route className="w-4 h-4 mr-2" /> Generate Driest Route</>}
                  </Button>
                </div>
              )}

              {/* Manual route inputs (when no POI selected or routes found) */}
              {!selectedPOI && routes.length === 0 && (
                <>
                  {/* Departure time */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)}
                      className="flex-1 text-sm bg-muted/20 rounded-xl px-3 py-2.5 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                    {departureTime && <button onClick={() => setDepartureTime('')} className="text-xs text-muted-foreground">Now</button>}
                  </div>

                  {/* From input */}
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input type="text" value={fromQuery}
                          onChange={(e) => { setFromQuery(e.target.value); setSearching('from'); geocode(e.target.value, 'route'); }}
                          onFocus={() => setSearching('from')}
                          placeholder="From..."
                          className="w-full text-sm bg-muted/20 rounded-xl pl-8 pr-3 py-2.5 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                        <span className="absolute left-2.5 top-2.5 text-sm">🟢</span>
                      </div>
                      <button onClick={() => useCurrentLocation('from')} className="px-3 py-2 rounded-xl bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/30">
                        <Crosshair className="w-4 h-4" />
                      </button>
                    </div>
                    {searching === 'from' && routeSearchResults.length > 0 && (
                      <div className="bg-background border border-border/30 rounded-xl shadow-lg max-h-32 overflow-y-auto">
                        {routeSearchResults.map((r: any, i: number) => (
                          <button key={i} onClick={() => selectRouteLocation(r, 'from')} className="w-full text-left text-xs px-3 py-2.5 hover:bg-muted/30 truncate">{r.display_name}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* To input */}
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input type="text" value={toQuery}
                          onChange={(e) => { setToQuery(e.target.value); setSearching('to'); geocode(e.target.value, 'route'); }}
                          onFocus={() => setSearching('to')}
                          placeholder="To..."
                          className="w-full text-sm bg-muted/20 rounded-xl pl-8 pr-3 py-2.5 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                        <span className="absolute left-2.5 top-2.5 text-sm">🔴</span>
                      </div>
                      <button onClick={() => useCurrentLocation('to')} className="px-3 py-2 rounded-xl bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/30">
                        <Crosshair className="w-4 h-4" />
                      </button>
                    </div>
                    {searching === 'to' && routeSearchResults.length > 0 && (
                      <div className="bg-background border border-border/30 rounded-xl shadow-lg max-h-32 overflow-y-auto">
                        {routeSearchResults.map((r: any, i: number) => (
                          <button key={i} onClick={() => selectRouteLocation(r, 'to')} className="w-full text-left text-xs px-3 py-2.5 hover:bg-muted/30 truncate">{r.display_name}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => findRoutes()} disabled={loading || !fromCoords || !toCoords} size="sm" className="w-full">
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing rain...</> : <><Route className="w-4 h-4 mr-2" /> Find Driest Route</>}
                  </Button>
                </>
              )}

              {/* Dry Windows */}
              {fromCoords && toCoords && routes.length > 0 && (
                <DryWindows fromCoords={fromCoords} toCoords={toCoords} routeGeometry={routes[bestRouteIdx]?.geometry || []} isImperial={isImperial} />
              )}

              {/* Route results */}
              {routes.length > 0 && (
                <div className="space-y-2">
                  {/* Back to search */}
                  <button onClick={() => { setRoutes([]); setBestRouteIdx(0); setSelectedPOI(null); setFromCoords(null); setToCoords(null); setFromQuery(''); setToQuery(''); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> New search
                  </button>

                  {routes[bestRouteIdx]?.rainTimeline?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium">Rain along route</p>
                      <div className="flex h-3 rounded-full overflow-hidden border border-border/30">
                        {routes[bestRouteIdx].rainTimeline.map((seg, i) => (
                          <div key={i} className="flex-1" style={{
                            backgroundColor: seg.rainProb < 30 ? 'hsl(142,71%,45%)' : seg.rainProb < 60 ? 'hsl(48,96%,53%)' : 'hsl(0,84%,60%)',
                            opacity: 0.7 + (seg.rainProb / 100) * 0.3,
                          }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {routes.map((route, i) => (
                    <button key={i} onClick={() => { setBestRouteIdx(i); drawRoutesFn(routes, i); }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-all ${
                        i === bestRouteIdx ? 'bg-primary/10 border border-primary/30' : 'bg-muted/20 border border-border/20 hover:bg-muted/30'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{route.label}</span>
                        <span className="text-muted-foreground text-xs">{formatDistance(route.distance)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(route.duration)}</span>
                        <span className={`flex items-center gap-1 font-bold ${route.rainScore < 30 ? 'text-green-500' : route.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          <Umbrella className="w-3 h-3" /> {route.rainScore}%
                        </span>
                      </div>
                    </button>
                  ))}

                  {routes[bestRouteIdx] && (() => {
                    const eta = new Date(Date.now() + routes[bestRouteIdx].duration * 1000);
                    return (
                      <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 text-xs">
                        <span className="text-primary font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ETA: {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-muted-foreground">{formatDuration(routes[bestRouteIdx].duration)} · {formatDistance(routes[bestRouteIdx].distance)}</span>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setNavigating(true)}>
                      <Navigation2 className="w-4 h-4 mr-1.5" /> Go
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAR(true)}><Camera className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const route = routes[bestRouteIdx];
                      const text = `🌂 DryRoute: ${fromQuery} → ${toQuery}\n☔ Rain: ${route.rainScore}%\n⏱ ${formatDuration(route.duration)} | 📏 ${formatDistance(route.distance)}\nPlan at rainz.net/dryroutes`;
                      navigator.share?.({ title: 'DryRoute', text }).catch(() => navigator.clipboard.writeText(text).then(() => toast.success('Copied!')));
                    }}><Share2 className="w-4 h-4" /></Button>
                  </div>

                  <UmbrellaScore rainScore={routes[bestRouteIdx].rainScore} />
                  <RouteCarbonTracker distanceMeters={routes[bestRouteIdx].distance} durationSeconds={routes[bestRouteIdx].duration} transportMode={transportMode} isImperial={isImperial} />
                </div>
              )}

              {navigating && routes[bestRouteIdx] && (
                <DryRouteNavigation route={routes[bestRouteIdx]} isImperial={isImperial} mapInstance={mapInstance.current} L={LRef.current} onStop={() => setNavigating(false)} />
              )}
              {routes[bestRouteIdx] && <DryRouteAR open={showAR} onOpenChange={setShowAR} route={routes[bestRouteIdx]} userPosition={userPosition} currentStepIdx={0} distanceToNext={null} isImperial={isImperial} />}
            </>
          )}

          {/* TRACK MODE */}
          {appMode === 'track' && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                {TRACK_TRANSPORT_MODES.map(({ mode, icon, label }) => (
                  <button key={mode} onClick={() => setTransportMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-2.5 rounded-xl border transition-all font-medium ${
                      transportMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 text-muted-foreground border-border/30'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {trackingState === 'idle' && !trackSummary && (
                <Button onClick={startTracking} size="sm" className="w-full"><Play className="w-4 h-4 mr-2" /> Start Activity</Button>
              )}

              {(trackingState === 'recording' || trackingState === 'paused') && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/20 rounded-xl p-3 text-center border border-border/30">
                      <div className="text-lg font-bold font-mono tabular-nums">{formatElapsed(trackElapsed)}</div>
                      <div className="text-[10px] text-muted-foreground">Time</div>
                    </div>
                    <div className="bg-muted/20 rounded-xl p-3 text-center border border-border/30">
                      <div className="text-lg font-bold tabular-nums">{formatDistance(trackDistance)}</div>
                      <div className="text-[10px] text-muted-foreground">Distance</div>
                    </div>
                    <div className="bg-muted/20 rounded-xl p-3 text-center border border-border/30">
                      <div className="text-lg font-bold tabular-nums">{formatPace(trackDistance > 0 ? trackElapsed / (trackDistance / (isImperial ? 1609.34 : 1000)) : 0)}</div>
                      <div className="text-[10px] text-muted-foreground">Pace</div>
                    </div>
                  </div>
                  {autoPaused && (
                    <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-yellow-600">
                      <Pause className="w-3 h-3" /> Auto-paused — not moving
                    </div>
                  )}
                  <div className="flex gap-2">
                    {trackingState === 'recording' ? (
                      <Button onClick={pauseTracking} size="sm" variant="outline" className="flex-1"><Pause className="w-4 h-4 mr-1" /> Pause</Button>
                    ) : (
                      <Button onClick={resumeTracking} size="sm" className="flex-1"><Play className="w-4 h-4 mr-1" /> Resume</Button>
                    )}
                    <Button onClick={stopTracking} size="sm" variant="destructive" className="px-4"><CircleStop className="w-4 h-4 mr-1" /> Stop</Button>
                  </div>
                </>
              )}

              {trackSummary && (
                <div className="space-y-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-semibold"><Activity className="w-4 h-4" /> Activity Complete!</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center"><div className="text-lg font-bold">{formatDistance(trackSummary.distance)}</div><div className="text-[10px] text-muted-foreground">Distance</div></div>
                      <div className="text-center"><div className="text-lg font-bold">{formatElapsed(trackSummary.duration)}</div><div className="text-[10px] text-muted-foreground">Duration</div></div>
                      <div className="text-center"><div className="text-lg font-bold">{formatPace(trackSummary.avgPace)}</div><div className="text-[10px] text-muted-foreground">Avg Pace</div></div>
                    </div>
                    <div className="text-center text-xs text-muted-foreground">🔥 ~{Math.round((trackSummary.distance / 1000) * getCaloriesPerKm(transportMode))} cal</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      const text = `🏃 Activity!\n📏 ${formatDistance(trackSummary.distance)}\n⏱ ${formatElapsed(trackSummary.duration)}\n⚡ ${formatPace(trackSummary.avgPace)}\nTracked with Rainz DryRoutes`;
                      navigator.share?.({ title: 'DryRoutes Activity', text }).catch(() => navigator.clipboard.writeText(text).then(() => toast.success('Copied!')));
                    }}><Share2 className="w-4 h-4 mr-1" /> Share</Button>
                    <Button size="sm" variant="outline" onClick={() => { setTrackSummary(null); setTrackPoints([]); }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DRAW MODE */}
          {appMode === 'create-route' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Point Type</label>
                <div className="flex gap-1.5">
                  {([
                    { type: 'start' as const, label: '🟢 Start' },
                    { type: 'waypoint' as const, label: '⚪ Waypoint' },
                    { type: 'end' as const, label: '🏁 End' },
                  ]).map(({ type, label }) => (
                    <button key={type} onClick={() => setCurrentPointType(type)}
                      className={`flex-1 px-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                        currentPointType === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 text-muted-foreground border-border/30'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              {drawRoutePoints.length > 0 && (
                <>
                  <div className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2.5 border border-border/20">
                    <Route className="w-4 h-4 text-primary" />
                    <div className="flex-1"><p className="text-xs text-muted-foreground">Distance</p><p className="text-sm font-semibold">{formatDistance(drawDistance)}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { if (drawRoutePoints.length >= 2) setDrawRoutePoints(prev => prev.slice(0, -1)); }} size="sm" variant="outline" className="text-xs">↶ Undo</Button>
                    <Button onClick={() => { setDrawRoutePoints([]); setDrawDistance(0); setDrawnRoute(null); setCurrentPointType('start'); }} size="sm" variant="outline" className="flex-1 text-xs"><Trash2 className="w-3.5 h-3.5 mr-1" /> Clear</Button>
                    <Button onClick={finalizeDrawnRoute} size="sm" disabled={drawLoading || drawRoutePoints.length < 2} className="flex-1 text-xs">
                      {drawLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Done</>}
                    </Button>
                  </div>
                </>
              )}

              {drawRoutePoints.length === 0 && (
                <div className="text-center py-4">
                  <Pencil className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Tap on the map to place points</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Start 🟢 → Waypoints ⚪ → End 🏁</p>
                </div>
              )}

              {drawnRoute && (
                <div className="bg-muted/20 rounded-xl px-3 py-2.5 border border-border/20 flex items-center justify-between text-xs">
                  <span className="font-medium">✏️ Drawn Route</span>
                  <div className="flex items-center gap-3">
                    <span>{formatDistance(drawnRoute.distance)}</span>
                    <span>{formatDuration(drawnRoute.duration)}</span>
                    <span className={`font-bold ${drawnRoute.rainScore < 30 ? 'text-green-500' : drawnRoute.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {drawnRoute.rainScore}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DryRouteBottomSheet>
    </div>
  );
}
