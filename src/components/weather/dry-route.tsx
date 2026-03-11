import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Loader2, Umbrella, Clock, Route, Maximize2, Minimize2, Car, Bike, Footprints, Calendar, Navigation2, Square, Share2, CloudRain, Camera, Play, Pause, CircleStop, Pencil, Trash2, Timer, Zap, Activity, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useLazyMap } from '@/hooks/use-lazy-map';
import { useAuth } from '@/hooks/use-auth';
import { DryRouteNavigation } from './dry-route-navigation';
import { DryRouteAR } from './dry-route-ar';
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
type AppMode = 'route' | 'track' | 'create-route';
type TrackingState = 'idle' | 'recording' | 'paused';

interface TrackSummary {
  distance: number;
  duration: number;
  avgPace: number; // seconds per km
  points: [number, number][];
  startTime: number;
  endTime: number;
}

interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  route_type: 'found' | 'created' | 'tracked';
  transport_mode: TransportMode;
  start_location: string | null;
  end_location: string | null;
  start_coords: { lat: number; lng: number } | null;
  end_coords: { lat: number; lng: number } | null;
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
  rain_score: number | null;
  rain_timeline: { distance: number; rainProb: number }[] | null;
  steps: RouteStep[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SavedActivity {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  activity_type: string;
  transport_mode: TransportMode;
  started_at: string;
  completed_at: string;
  distance: number;
  duration: number;
  avg_pace: number | null;
  gps_points: Array<{ lat: number; lng: number; timestamp: number }>;
  calories_estimate: number | null;
  co2_estimate: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const TRANSPORT_MODES: { mode: TransportMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'driving', icon: <Car className="w-3.5 h-3.5" />, label: 'Drive' },
  { mode: 'cycling', icon: <Bike className="w-3.5 h-3.5" />, label: 'Bike' },
  { mode: 'walking', icon: <Footprints className="w-3.5 h-3.5" />, label: 'Walk' },
];

const APP_MODES: { mode: AppMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'route', icon: <Route className="w-3.5 h-3.5" />, label: 'Route' },
  { mode: 'track', icon: <Activity className="w-3.5 h-3.5" />, label: 'Track' },
  { mode: 'create-route', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Create Route' },
];

// Haversine distance between two points in meters
function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function DryRoute({ latitude, longitude, locationName, isImperial }: DryRouteProps) {
  const { user } = useAuth();
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
  const [showAR, setShowAR] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const radarLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // App mode state
  const [appMode, setAppMode] = useState<AppMode>('route');

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
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [selectedSavedRoute, setSelectedSavedRoute] = useState<SavedRoute | null>(null);
  const [showSaveActivityModal, setShowSaveActivityModal] = useState(false);
  const [saveActivityNameInput, setSaveActivityNameInput] = useState('');
  const [activityIsPublic, setActivityIsPublic] = useState(false);

  // Create Route mode state
  interface DrawPoint {
    lat: number;
    lng: number;
    type: 'start' | 'end' | 'waypoint';
  }

  const [isPlacingPoints, setIsPlacingPoints] = useState(false);
  const [drawRoutePoints, setDrawRoutePoints] = useState<DrawPoint[]>([]);
  const [drawDistance, setDrawDistance] = useState(0);
  const [currentPointType, setCurrentPointType] = useState<'start' | 'waypoint' | 'end'>('start');
  const [drawnRoute, setDrawnRoute] = useState<RouteResult | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawSnappedData, setDrawSnappedData] = useState<RouteResult | null>(null);
  const drawPolylineRef = useRef<any>(null);
  const drawMarkersRef = useRef<any[]>([]);
  const drawLinesRef = useRef<any[]>([]);
  const drawSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDrawConfirmation, setShowDrawConfirmation] = useState(false);
  const [drawConfirmationData, setDrawConfirmationData] = useState<RouteResult | null>(null);
  const [showSaveRouteModal, setShowSaveRouteModal] = useState(false);
  const [saveRouteNameInput, setSaveRouteNameInput] = useState('');
  const [routeIsPublic, setRouteIsPublic] = useState(false);

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

    if (routes.length > 0) {
      setTimeout(() => drawRoutes(routes, bestRouteIdx), 100);
    }
  }, [leafletLoaded, latitude, longitude, routes, bestRouteIdx, drawRoutes, isFullscreen]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove(); } catch {}
        mapInstance.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [leafletLoaded, isFullscreen]);

  // Reinitialize map when mode changes while not in fullscreen
  useEffect(() => {
    if (!isFullscreen && leafletLoaded && mapInstance.current) {
      const timer = setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [appMode, isFullscreen, leafletLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => { initMap(); }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, initMap]);

  // Reinitialize map when component becomes visible
  useEffect(() => {
    if (isVisible && leafletLoaded && !mapInstance.current) {
      const timer = setTimeout(() => { initMap(); }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, leafletLoaded, initMap]);

  // Fetch saved routes when entering track mode
  useEffect(() => {
    if (appMode === 'track') {
      fetchSavedRoutes();
    }
  }, [appMode, fetchSavedRoutes]);

  // Always track user position for blue dot on map
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(newPos);

        // If tracking, add point
        if (trackingState === 'recording') {
          setTrackPoints(prev => {
            const updated = [...prev, newPos];
            if (prev.length > 0) {
              const dist = haversineDistance(prev[prev.length - 1], newPos);
              if (dist > 2) { // Only count if moved >2m (noise filter)
                setTrackDistance(d => d + dist);
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
  }, [trackingState]);

  // Show blue user marker on map with smooth gliding
  useEffect(() => {
    if (!userPosition || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;

    if (userMarkerRef.current) {
      const start = userMarkerRef.current.getLatLng();
      const end = L.latLng(userPosition);
      const duration = 800;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const lat = start.lat + (end.lat - start.lat) * ease;
        const lng = start.lng + (end.lng - start.lng) * ease;
        userMarkerRef.current?.setLatLng([lat, lng]);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.5);transition:box-shadow 0.3s"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      userMarkerRef.current = L.marker(userPosition, { icon, zIndexOffset: 1000 }).addTo(mapInstance.current);
    }
  }, [userPosition]);

  // Draw track polyline on map
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;

    if (trackPolylineRef.current) {
      mapInstance.current.removeLayer(trackPolylineRef.current);
      trackPolylineRef.current = null;
    }

    if (trackPoints.length > 1) {
      trackPolylineRef.current = L.polyline(trackPoints, {
        color: 'hsl(217, 91%, 60%)',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstance.current);

      // Auto-center on latest point when recording
      if (trackingState === 'recording') {
        mapInstance.current.setView(trackPoints[trackPoints.length - 1], mapInstance.current.getZoom(), { animate: true });
      }
    }
  }, [trackPoints, trackingState]);

  // Track elapsed timer
  useEffect(() => {
    if (trackingState === 'recording') {
      if (!trackStartTime) {
        setTrackStartTime(Date.now());
      }
      trackTimerRef.current = setInterval(() => {
        setTrackElapsed(pausedElapsedRef.current + (Date.now() - (trackStartTime || Date.now())) / 1000);
      }, 1000);
    } else {
      if (trackTimerRef.current) {
        clearInterval(trackTimerRef.current);
        trackTimerRef.current = null;
      }
    }
    return () => {
      if (trackTimerRef.current) clearInterval(trackTimerRef.current);
    };
  }, [trackingState, trackStartTime]);

  // Create Route mode: handle click to place points
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const map = mapInstance.current;
    const L = LRef.current;
    const container = map.getContainer();

    if (appMode === 'create-route') {
      const onClick = (e: any) => {
        const pt = e.latlng;
        const newPoint: DrawPoint = {
          lat: pt.lat,
          lng: pt.lng,
          type: currentPointType,
        };

        // Handle start point constraint (only one)
        if (currentPointType === 'start' && drawRoutePoints.some(p => p.type === 'start')) {
          toast.error('Route can only have one start point');
          return;
        }

        // Handle end point constraint (must be last)
        if (drawRoutePoints.some(p => p.type === 'end')) {
          toast.error('End point must be the last point - clear it first');
          return;
        }

        setDrawRoutePoints(prev => [...prev, newPoint]);

        // Snap the new segment to roads if not the first point
        if (drawRoutePoints.length > 0 && currentPointType !== 'start') {
          snapSegmentToRoads(drawRoutePoints[drawRoutePoints.length - 1], newPoint);
        }
      };

      map.on('click', onClick);
      container.style.cursor = 'crosshair';

      return () => {
        map.off('click', onClick);
        container.style.cursor = '';
      };
    }
  }, [appMode, drawRoutePoints, currentPointType]);

  // Render points and lines on map
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Clear old markers and lines
    drawMarkersRef.current.forEach(m => map.removeLayer(m));
    drawMarkersRef.current = [];
    drawLinesRef.current.forEach(l => map.removeLayer(l));
    drawLinesRef.current = [];

    if (drawRoutePoints.length === 0) return;

    // Render markers for each point
    drawRoutePoints.forEach((point, idx) => {
      let emoji = '⚪';
      if (point.type === 'start') emoji = '🟢';
      else if (point.type === 'end') emoji = '🏁';

      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html: `<div style="font-size: 24px; cursor: pointer;">${emoji}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        title: `${point.type} point`,
      }).addTo(map);

      // Add click handler to delete point
      marker.on('click', (e: any) => {
        e.originalEvent.stopPropagation(); // Prevent adding new point
        setDrawRoutePoints(prev => prev.filter((_, i) => i !== idx));
      });

      drawMarkersRef.current.push(marker);
    });

    // Render lines connecting points
    if (drawnRoute && drawnRoute.geometry) {
      const line = L.polyline(drawnRoute.geometry, {
        color: 'hsl(142, 71%, 45%)', // Green for snapped routes
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
      }).addTo(map);
      drawLinesRef.current.push(line);
    } else if (drawRoutePoints.length > 1) {
      // Show temporary line connecting points if not snapped yet
      const tempGeometry = drawRoutePoints.map(p => [p.lat, p.lng]);
      const line = L.polyline(tempGeometry, {
        color: 'hsl(280, 80%, 55%)',
        weight: 3,
        opacity: 0.5,
        dashArray: '6 6',
        lineCap: 'round',
      }).addTo(map);
      drawLinesRef.current.push(line);
    }
  }, [drawRoutePoints, drawnRoute]);

  // Helper: Calculate haversine distance and format it
  const getDistanceFromGeometry = (geometry: [number, number][]): number => {
    let total = 0;
    for (let i = 0; i < geometry.length - 1; i++) {
      total += haversineDistance(geometry[i], geometry[i + 1]);
    }
    return total;
  };

  // Snap a single segment (from previous point to new point) to roads
  const snapSegmentToRoads = async (prevPoint: DrawPoint, newPoint: DrawPoint) => {
    try {
      const profile = transportMode === 'driving' ? 'car' : transportMode === 'cycling' ? 'bike' : 'foot';
      const coordsStr = `${prevPoint.lng},${prevPoint.lat};${newPoint.lng},${newPoint.lat}`;

      const res = await fetch(
        `https://router.project-osrm.org/match/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&radiuses=50;50&steps=true`
      );

      if (!res.ok) return;
      const data = await res.json();

      if (data.matchings && data.matchings.length > 0) {
        const matching = data.matchings[0];
        const segmentGeometry: [number, number][] = matching.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        // Accumulate geometry
        const currentGeometry = drawnRoute ? [...drawnRoute.geometry] : [];
        const newGeometry = [...currentGeometry, ...segmentGeometry];

        // Calculate complete route details
        const { score: rainScore, timeline: rainTimeline } = await getRainScoreForRoute(newGeometry);
        const totalDistance = getDistanceFromGeometry(newGeometry);

        const result: RouteResult = {
          distance: totalDistance,
          duration: matching.duration * (drawnRoute ? drawnRoute.duration / matching.duration : 1),
          rainScore,
          geometry: newGeometry,
          label: '✏️ Drawing...',
          steps: [],
          rainTimeline,
        };

        setDrawnRoute(result);
        setDrawDistance(totalDistance);
      } else {
        // Fallback: use direct connection without snapping
        const directDist = haversineDistance([prevPoint.lat, prevPoint.lng], [newPoint.lat, newPoint.lng]);
        setDrawDistance(prev => prev + directDist);
      }
    } catch (err) {
      // Silent fail for segment snapping
    }
  };

  // Finalize route: snap all points together and create final route
  const finalizeDrawnRoute = async () => {
    if (drawRoutePoints.length < 2) {
      toast.error('Need at least 2 points to create a route');
      return;
    }

    // Must have start and end points
    if (!drawRoutePoints.some(p => p.type === 'start') || !drawRoutePoints.some(p => p.type === 'end')) {
      toast.error('Need both a start point and an end point');
      return;
    }

    setDrawLoading(true);

    try {
      const profile = transportMode === 'driving' ? 'car' : transportMode === 'cycling' ? 'bike' : 'foot';
      const coordsStr = drawRoutePoints.map(p => `${p.lng},${p.lat}`).join(';');

      const res = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=true`
      );

      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        const { score: rainScore, timeline: rainTimeline } = await getRainScoreForRoute(geometry);

        const steps: RouteStep[] = [];
        for (const leg of route.legs) {
          for (const s of (leg.steps || [])) {
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

        const result: RouteResult = {
          distance: route.distance,
          duration: route.duration,
          rainScore,
          geometry,
          label: '✏️ Drawn Route',
          steps,
          rainTimeline,
        };

        setDrawnRoute(result);
        setDrawDistance(route.distance);
        setDrawConfirmationData(result);
        setShowDrawConfirmation(true);
        toast.success('Route ready for confirmation!');
      } else {
        toast.error('Could not create route from points');
      }
    } catch (err) {
      toast.error('Failed to create route');
    }
    setDrawLoading(false);
  };

  // Rain radar overlay toggle
  useEffect(() => {
    const L = LRef.current;
    if (!mapInstance.current || !L) return;

    if (showRadar && !radarLayerRef.current) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ohwtbkudpkfbakynikyj';
      radarLayerRef.current = L.tileLayer(
        `https://${projectId}.supabase.co/functions/v1/owm-tile-proxy?layer=precipitation_new&z={z}&x={x}&y={y}`,
        { opacity: 0.5, minZoom: 0, maxZoom: 18, zIndex: 500 }
      ).addTo(mapInstance.current);
    } else if (!showRadar && radarLayerRef.current) {
      mapInstance.current.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
  }, [showRadar]);

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geocode = useCallback((query: string) => {
    if (query.length < 3) return;
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('geocode-address', { body: { query } });
        setSearchResults(data?.results || []);
      } catch {
        setSearchResults([]);
      }
    }, 400);
  }, []);

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

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm: number) => {
    if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return '--:--';
    const m = Math.floor(secondsPerKm / 60);
    const s = Math.floor(secondsPerKm % 60);
    const unit = isImperial ? '/mi' : '/km';
    return `${m}:${s.toString().padStart(2, '0')}${unit}`;
  };

  const startNavigation = () => {
    if (routes.length === 0) return;
    setNavigating(true);
    setIsFullscreen(true);
  };

  const stopNavigation = () => {
    setNavigating(false);
  };

  // Track mode controls
  const startTracking = () => {
    setTrackPoints([]);
    setTrackDistance(0);
    setTrackElapsed(0);
    setTrackSummary(null);
    pausedElapsedRef.current = 0;
    setTrackStartTime(Date.now());
    setTrackingState('recording');
    setIsFullscreen(true);
    toast.success('Activity started! 🏃');
  };

  const pauseTracking = () => {
    pausedElapsedRef.current = trackElapsed;
    setTrackingState('paused');
  };

  const resumeTracking = () => {
    setTrackStartTime(Date.now());
    setTrackingState('recording');
  };

  const stopTracking = () => {
    setTrackingState('idle');
    const distKm = trackDistance / 1000;
    const avgPace = distKm > 0 ? trackElapsed / distKm : 0;
    setTrackSummary({
      distance: trackDistance,
      duration: trackElapsed,
      avgPace,
      points: trackPoints,
      startTime: trackStartTime || Date.now(),
      endTime: Date.now(),
    });
    toast.success('Activity saved! 🎉');
  };

  // Fetch saved routes from database
  const fetchSavedRoutes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_routes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedRoutes(data as SavedRoute[]);
    } catch (err) {
      console.error('Failed to fetch saved routes:', err);
    }
  }, [user]);

  // Save route to database
  const saveRoute = async (routeData: RouteResult, routeName: string, startLoc: string, endLoc: string, isPublic: boolean) => {
    if (!user) {
      toast.error('You must be logged in to save routes');
      return;
    }

    try {
      const { error } = await supabase.from('saved_routes').insert({
        user_id: user.id,
        name: routeName,
        description: null,
        route_type: appMode === 'create-route' ? 'created' : 'found',
        transport_mode: transportMode,
        start_location: startLoc,
        end_location: endLoc,
        start_coords: routeData.geometry[0] ? { lat: routeData.geometry[0][0], lng: routeData.geometry[0][1] } : null,
        end_coords: routeData.geometry[routeData.geometry.length - 1] ? { lat: routeData.geometry[routeData.geometry.length - 1][0], lng: routeData.geometry[routeData.geometry.length - 1][1] } : null,
        geometry: { coordinates: routeData.geometry },
        distance: routeData.distance,
        duration: routeData.duration,
        rain_score: routeData.rainScore,
        rain_timeline: routeData.rainTimeline,
        steps: routeData.steps,
        is_public: isPublic,
      });

      if (error) throw error;
      toast.success('Route saved! 🎉');
      await fetchSavedRoutes();
      setShowSaveRouteModal(false);
      setSaveRouteNameInput('');
      setRouteIsPublic(false);
    } catch (err) {
      toast.error('Failed to save route');
      console.error('Save route error:', err);
    }
  };

  // Save activity to database
  const saveActivity = async (activityName: string, isPublic: boolean) => {
    if (!user || !trackSummary) {
      toast.error('You must be logged in to save activities');
      return;
    }

    try {
      // Calculate calories and CO2 estimates
      const caloriesPerKm = transportMode === 'walking' ? 65 : transportMode === 'cycling' ? 30 : 0;
      const caloriesEstimate = (trackSummary.distance / 1000) * caloriesPerKm;

      const co2PerKm = transportMode === 'driving' ? 120 : 0;
      const co2Estimate = (trackSummary.distance / 1000) * co2PerKm;

      const { error } = await supabase.from('saved_activities').insert({
        user_id: user.id,
        name: activityName,
        description: null,
        activity_type: 'track',
        transport_mode: transportMode,
        started_at: new Date(trackSummary.startTime).toISOString(),
        completed_at: new Date(trackSummary.endTime).toISOString(),
        distance: trackSummary.distance,
        duration: trackSummary.duration,
        avg_pace: trackSummary.avgPace,
        gps_points: trackSummary.points.map((p, idx) => ({
          lat: p[0],
          lng: p[1],
          timestamp: trackSummary.startTime + (idx * (trackSummary.duration * 1000 / trackSummary.points.length)),
        })),
        calories_estimate: caloriesEstimate > 0 ? caloriesEstimate : null,
        co2_estimate: co2Estimate > 0 ? co2Estimate : null,
        is_public: isPublic,
      });

      if (error) throw error;
      toast.success('Activity saved! 🎉');
      setShowSaveActivityModal(false);
      setSaveActivityNameInput('');
      setActivityIsPublic(false);
    } catch (err) {
      toast.error('Failed to save activity');
      console.error('Save activity error:', err);
    }
  };

  const shareActivity = async () => {
    if (!trackSummary) return;
    const text = `🏃 Activity Complete!\n📏 ${formatDistance(trackSummary.distance)}\n⏱ ${formatElapsed(trackSummary.duration)}\n⚡ Pace: ${formatPace(trackSummary.avgPace)}\n\nTracked with Rainz DryRoutes`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'DryRoutes Activity', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
      }
    } catch { /* cancelled */ }
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

  // Re-fetch routes when transport mode changes
  const prevTransportRef = useRef(transportMode);
  useEffect(() => {
    if (prevTransportRef.current !== transportMode && routes.length > 0 && fromCoords && toCoords) {
      prevTransportRef.current = transportMode;
      findRoutes();
    } else {
      prevTransportRef.current = transportMode;
    }
  }, [transportMode]);

  // Mode switcher component
  const modeSwitcher = (
    <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/30">
      {APP_MODES.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => {
            setAppMode(mode);
            // Clean up when switching modes
            if (mode !== 'create-route') {
              setDrawRoutePoints([]);
              setDrawnRoute(null);
              setDrawSnappedData(null);
              setIsDrawing(false);
              if (drawPolylineRef.current && mapInstance.current) {
                mapInstance.current.removeLayer(drawPolylineRef.current);
                drawPolylineRef.current = null;
              }
            }
            if (mode !== 'track' && trackingState !== 'idle') {
              // Don't stop tracking if switching away briefly
            }
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-all ${
            appMode === mode
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );

  // Track mode UI
  const trackContent = (
    <div className="space-y-3">
      {/* Transport mode selector for track - exclude driving */}
      <div className="flex gap-1">
        {TRANSPORT_MODES.filter(m => m.mode !== 'driving').map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setTransportMode(mode === 'walking' || mode === 'cycling' ? mode : 'walking')}
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

      {/* Saved routes selector */}
      {trackingState === 'idle' && savedRoutes.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Or follow a saved route</label>
          <select
            value={selectedSavedRoute?.id || ''}
            onChange={(e) => {
              const route = savedRoutes.find(r => r.id === e.target.value) || null;
              setSelectedSavedRoute(route);
            }}
            className="w-full text-xs bg-muted/30 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select a saved route...</option>
            {savedRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} • {formatDistance(route.distance)}
              </option>
            ))}
          </select>
          {selectedSavedRoute && (
            <div className="text-xs bg-primary/5 border border-primary/20 rounded-lg p-2 space-y-1">
              <div className="font-medium text-foreground">{selectedSavedRoute.name}</div>
              <div className="text-muted-foreground text-[11px]">
                {formatDistance(selectedSavedRoute.distance)} • {formatDuration(selectedSavedRoute.duration)} • {selectedSavedRoute.rain_score}% rain
              </div>
            </div>
          )}
        </div>
      )}

      {trackingState === 'idle' && !trackSummary && (
        <Button onClick={startTracking} size="sm" className="w-full text-xs">
          <Play className="w-3.5 h-3.5 mr-1.5" /> Start Activity
        </Button>
      )}

      {(trackingState === 'recording' || trackingState === 'paused') && (
        <>
          {/* Live stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/30">
              <div className="text-lg font-bold font-mono tabular-nums">{formatElapsed(trackElapsed)}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" /> Time
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/30">
              <div className="text-lg font-bold tabular-nums">{formatDistance(trackDistance)}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Route className="w-3 h-3" /> Distance
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center border border-border/30">
              <div className="text-lg font-bold tabular-nums">
                {formatPace(trackDistance > 0 ? trackElapsed / (trackDistance / (isImperial ? 1609.34 : 1000)) : 0)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> Pace
              </div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex gap-2">
            {trackingState === 'recording' ? (
              <Button onClick={pauseTracking} size="sm" variant="outline" className="flex-1 text-xs">
                <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
              </Button>
            ) : (
              <Button onClick={resumeTracking} size="sm" className="flex-1 text-xs">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
              </Button>
            )}
            <Button onClick={stopTracking} size="sm" variant="destructive" className="text-xs px-4">
              <CircleStop className="w-3.5 h-3.5 mr-1.5" /> Stop
            </Button>
          </div>
        </>
      )}

      {/* Activity summary */}
      {trackSummary && (
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Activity className="w-4 h-4" /> Activity Complete!
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold">{formatDistance(trackSummary.distance)}</div>
                <div className="text-[10px] text-muted-foreground">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatElapsed(trackSummary.duration)}</div>
                <div className="text-[10px] text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{formatPace(trackSummary.avgPace)}</div>
                <div className="text-[10px] text-muted-foreground">Avg Pace</div>
              </div>
            </div>
            {/* Calories estimate (rough: ~60 cal/km walking, ~40 cycling) */}
            <div className="text-center text-xs text-muted-foreground">
              🔥 ~{Math.round((trackSummary.distance / 1000) * (transportMode === 'walking' ? 60 : 40))} cal burned
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowSaveActivityModal(true)} size="sm" className="flex-1 text-xs">
              <Check className="w-3.5 h-3.5 mr-1.5" /> Save Activity
            </Button>
            <Button onClick={shareActivity} size="sm" variant="outline" className="flex-1 text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
            </Button>
            <Button onClick={() => { setTrackSummary(null); setTrackPoints([]); }} size="sm" variant="outline" className="text-xs">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Save Activity Modal */}
      {showSaveActivityModal && trackSummary && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in duration-200">
          <div className="w-full bg-background border-t border-border/50 rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Save Your Activity</h3>
              <button
                onClick={() => {
                  setShowSaveActivityModal(false);
                  setSaveActivityNameInput('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Activity name input */}
              <input
                type="text"
                value={saveActivityNameInput}
                onChange={(e) => setSaveActivityNameInput(e.target.value)}
                placeholder={`Activity - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                className="w-full text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Public switch */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Make activity public</label>
                <button
                  onClick={() => setActivityIsPublic(!activityIsPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    activityIsPublic ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      activityIsPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Activity stats preview */}
              <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium">{formatDistance(trackSummary.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formatElapsed(trackSummary.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Pace:</span>
                  <span className="font-medium">{formatPace(trackSummary.avgPace)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowSaveActivityModal(false);
                    setSaveActivityNameInput('');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const activityName = saveActivityNameInput.trim() || `Activity - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    saveActivity(activityName, activityIsPublic);
                  }}
                  size="sm"
                  className="flex-1"
                >
                  Save Activity
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const drawContent = (
    <div className="space-y-3">
      {/* Confirmation Dialog */}
      {showDrawConfirmation && drawConfirmationData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in duration-200">
          <div className="w-full bg-background border-t border-border/50 rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Confirm Your Route</h3>
              <button
                onClick={() => setShowDrawConfirmation(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Route details */}
            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
              {/* Rain timeline */}
              {drawConfirmationData.rainTimeline?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Rain along route</p>
                  <div className="flex h-2 rounded-full overflow-hidden border border-border/30">
                    {drawConfirmationData.rainTimeline.map((segment, i) => (
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
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">{formatDistance(drawConfirmationData.distance)}</p>
                  <p className="text-[10px] text-muted-foreground">Distance</p>
                </div>
                <div className="text-center border-x border-border/30">
                  <p className="text-muted-foreground">{formatDuration(drawConfirmationData.duration)}</p>
                  <p className="text-[10px] text-muted-foreground">Duration</p>
                </div>
                <div className="text-center">
                  <p className={`font-bold ${
                    drawConfirmationData.rainScore < 30 ? 'text-green-500' : drawConfirmationData.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {drawConfirmationData.rainScore}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rain</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDrawConfirmation(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Edit Route
              </Button>
              <Button
                onClick={() => setShowSaveRouteModal(true)}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Save Route
              </Button>
              <Button
                onClick={() => {
                  setShowDrawConfirmation(false);
                  toast.success('Route created!');
                }}
                size="sm"
                className="flex-1"
              >
                Accept & Go
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Route Modal */}
      {showSaveRouteModal && drawnRoute && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in duration-200">
          <div className="w-full bg-background border-t border-border/50 rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Save Your Route</h3>
              <button
                onClick={() => {
                  setShowSaveRouteModal(false);
                  setSaveRouteNameInput('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Route name input */}
              <input
                type="text"
                value={saveRouteNameInput}
                onChange={(e) => setSaveRouteNameInput(e.target.value)}
                placeholder="e.g., Morning Commute..."
                className="w-full text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Public switch */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Make route public</label>
                <button
                  onClick={() => setRouteIsPublic(!routeIsPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    routeIsPublic ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      routeIsPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Route stats preview */}
              <div className="bg-muted/30 rounded-lg p-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium">{formatDistance(drawnRoute.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{formatDuration(drawnRoute.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rain:</span>
                  <span className={`font-medium ${
                    drawnRoute.rainScore < 30 ? 'text-green-500' : drawnRoute.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {drawnRoute.rainScore}%
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowSaveRouteModal(false);
                    setSaveRouteNameInput('');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!saveRouteNameInput.trim()) {
                      toast.error('Please enter a route name');
                      return;
                    }
                    saveRoute(drawnRoute, saveRouteNameInput, 'Created Route', 'Created Route', routeIsPublic);
                  }}
                  size="sm"
                  className="flex-1"
                  disabled={!saveRouteNameInput.trim()}
                >
                  Save Route
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showDrawConfirmation && (
        <>
          {/* Point Type Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Point Type</label>
            <div className="flex gap-1.5">
              {[
                { type: 'start' as const, label: '🟢 Start', description: 'Route origin' },
                { type: 'waypoint' as const, label: '⚪ Waypoint', description: 'Intermediate point' },
                { type: 'end' as const, label: '🏁 End', description: 'Route destination' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setCurrentPointType(type)}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-xs transition-all font-medium ${
                    currentPointType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance Display */}
          {drawRoutePoints.length > 0 && (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/20">
              <Route className="w-4 h-4 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold text-foreground">{formatDistance(drawDistance)}</p>
              </div>
              <span className="text-xl">📍</span>
            </div>
          )}

          {/* Points Status */}
          {drawRoutePoints.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="font-medium text-foreground">
                {drawRoutePoints.length} point{drawRoutePoints.length !== 1 ? 's' : ''} placed
              </div>
              <div className="text-muted-foreground text-[11px]">
                {drawRoutePoints.filter(p => p.type === 'start').length > 0 ? '✓ Start ' : '○ Start '}
                {drawRoutePoints.filter(p => p.type === 'end').length > 0 ? '✓ End' : '○ End'}
              </div>
            </div>
          )}

          {/* Instructions */}
          {drawRoutePoints.length === 0 && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click on the map to place points. Start with a green point (🟢), add waypoints (⚪), and finish with a flag (🏁).
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {drawRoutePoints.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (drawRoutePoints.length >= 2) {
                    setDrawRoutePoints(prev => prev.slice(0, -1));
                    // Reset distance if undoing makes it empty
                    if (drawRoutePoints.length === 2) {
                      setDrawDistance(0);
                      setDrawnRoute(null);
                    }
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={drawRoutePoints.length === 0}
              >
                ↶ Undo Last
              </Button>
              <Button
                onClick={() => {
                  setDrawRoutePoints([]);
                  setDrawDistance(0);
                  setDrawnRoute(null);
                  setShowDrawConfirmation(false);
                  setCurrentPointType('start');
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear All
              </Button>
              <Button
                onClick={finalizeDrawnRoute}
                size="sm"
                disabled={drawLoading || drawRoutePoints.length < 2}
                className="flex-1 text-xs"
              >
                {drawLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" /> Done!
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Transport modes */}
          <div className="flex gap-1">
            {TRANSPORT_MODES.filter(m => m.mode !== 'driving').map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setTransportMode(mode === 'walking' || mode === 'cycling' ? mode : 'walking')}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border transition-all ${
                  transportMode === mode
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/40'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Drawn Route Results */}
          {drawnRoute && (
            <div className="space-y-2 border-t border-border/30 pt-3">
              {/* Rain timeline */}
              {drawnRoute.rainTimeline?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Rain along route</p>
                  <div className="flex h-3 rounded-full overflow-hidden border border-border/30">
                    {drawnRoute.rainTimeline.map((segment, i) => (
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
                </div>
              )}

              {/* Route stats */}
              <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2.5 text-xs border border-border/20">
                <span className="font-medium">✏️ Drawn Route</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Route className="w-3 h-3" /> {formatDistance(drawnRoute.distance)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(drawnRoute.duration)}
                  </span>
                  <span className={`flex items-center gap-1 font-bold ${
                    drawnRoute.rainScore < 30 ? 'text-green-500' : drawnRoute.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    <Umbrella className="w-3 h-3" /> {drawnRoute.rainScore}%
                  </span>
                </div>
              </div>

              <UmbrellaScore rainScore={drawnRoute.rainScore} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const controlsContent = (
    <div className="space-y-3">
      {/* Transport mode selector */}
      <div className="flex gap-1">
        {TRANSPORT_MODES.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => {
              setTransportMode(mode);
              if (routes.length > 0 && fromCoords && toCoords) {
                setTimeout(() => findRoutes(), 50);
              }
            }}
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

      {/* Dry Windows */}
      {fromCoords && toCoords && routes.length > 0 && (
        <DryWindows
          fromCoords={fromCoords}
          toCoords={toCoords}
          routeGeometry={routes[bestRouteIdx]?.geometry || []}
          isImperial={isImperial}
        />
      )}
    </div>
  );

  const mapContent = (
    <div className="relative">
      <div ref={mapRef} className={`w-full rounded-xl overflow-hidden border border-border/30 ${isFullscreen ? 'h-[45vh]' : 'h-56'}`} />
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
      {appMode === 'create-route' && isPlacingPoints && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-full animate-pulse">
          📍 Click to place points
        </div>
      )}
    </div>
  );

  const resultsContent = (
    <div className="space-y-3">
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

          {/* ETA banner */}
          {routes[bestRouteIdx] && (() => {
            const eta = new Date(Date.now() + routes[bestRouteIdx].duration * 1000);
            const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ETA: {etaStr}</span>
                </div>
                <span className="text-muted-foreground">
                  {formatDuration(routes[bestRouteIdx].duration)} · {formatDistance(routes[bestRouteIdx].distance)}
                </span>
              </div>
            );
          })()}

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
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAR(true)}>
              <Camera className="w-3.5 h-3.5" />
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

      {/* AR Overlay */}
      {routes[bestRouteIdx] && (
        <DryRouteAR
          open={showAR}
          onOpenChange={setShowAR}
          route={routes[bestRouteIdx]}
          userPosition={userPosition}
          currentStepIdx={0}
          distanceToNext={null}
          isImperial={isImperial}
        />
      )}
    </div>
  );

  // Get mode-specific content
  const getModeContent = () => {
    switch (appMode) {
      case 'track':
        return trackContent;
      case 'draw':
        return drawContent;
      case 'route':
      default:
        return (
          <>
            {controlsContent}
            {resultsContent}
          </>
        );
    }
  };

  // Combined content for card (non-fullscreen) view
  const routeContent = (
    <div className="space-y-3">
      {modeSwitcher}
      {mapContent}
      {getModeContent()}
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

  // Fullscreen portal content
  const fullscreenContent = (
    <div
      className="fixed inset-0 z-50 bg-background animate-in fade-in duration-200"
      style={{ overflow: 'hidden' }}
    >
      {/* Fixed header */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background"
        style={{ height: '52px' }}
      >
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

      {/* Map — fixed position below header */}
      <div
        className="absolute left-0 right-0"
        style={{ top: '52px', height: '40vh' }}
      >
        <div ref={mapRef} className="w-full h-full" />
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
        {appMode === 'draw' && isDrawing && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-full animate-pulse">
            ✏️ Draw on map
          </div>
        )}
      </div>

      {/* Scrollable content area below map */}
      <div
        className="absolute left-0 right-0 bottom-0 overflow-y-scroll"
        style={{
          top: 'calc(52px + 40vh)',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="p-4 pb-12 space-y-3">
          {modeSwitcher}
          {getModeContent()}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="mb-4">
      {isFullscreen ? createPortal(fullscreenContent, document.body) : cardContent}
    </div>
  );
}
