import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Play, Pause, SkipBack, SkipForward, Map, Lock, Crown, Sparkles, Thermometer, Wind, CloudRain } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface RainMapCardProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

interface RadarFrame {
  time: number;
  path: string;
}

type MapMode = 'rain' | 'temperature' | 'wind';

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const owmTileUrl = (layer: string) =>
  `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/owm-tile-proxy?layer=${layer}&z={z}&x={x}&y={y}`;

const MODE_CONFIG: Record<MapMode, {
  label: string;
  icon: React.ReactNode;
  owmLayer?: string;
  legendItems?: { color: string; label: string }[];
  legendTitle?: string;
}> = {
  rain: {
    label: '🌧 Rain',
    icon: <CloudRain className="w-3.5 h-3.5" />,
    legendTitle: 'Precipitation',
    legendItems: [
      { color: '#88DDFF', label: 'Light' },
      { color: '#00BB00', label: 'Mod' },
      { color: '#FFFF00', label: 'Heavy' },
      { color: '#FF8800', label: 'Intense' },
      { color: '#FF0000', label: 'Extreme' },
    ],
  },
  temperature: {
    label: '🌡 Temp',
    icon: <Thermometer className="w-3.5 h-3.5" />,
    owmLayer: 'temp_new',
    legendTitle: 'Temperature',
    legendItems: [
      { color: '#9900CC', label: 'Freezing' },
      { color: '#0000FF', label: 'Cold' },
      { color: '#00CCFF', label: 'Cool' },
      { color: '#00FF00', label: 'Mild' },
      { color: '#FFFF00', label: 'Warm' },
      { color: '#FF8800', label: 'Hot' },
      { color: '#FF0000', label: 'Very Hot' },
    ],
  },
  wind: {
    label: '💨 Wind',
    icon: <Wind className="w-3.5 h-3.5" />,
    owmLayer: 'wind_new',
    legendTitle: 'Wind Speed',
    legendItems: [
      { color: '#FFFFFF', label: 'Calm' },
      { color: '#88DDFF', label: 'Breeze' },
      { color: '#00AAFF', label: 'Moderate' },
      { color: '#0000FF', label: 'Strong' },
      { color: '#FF0000', label: 'Gale' },
    ],
  },
};

// Locked version shown to non-subscribers
const LockedCard: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <div className="overflow-hidden rounded-2xl glass-card border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
    <div className="p-4 border-b border-border/50">
      <div className="flex items-center gap-2">
        <Map className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Weather Map</h3>
        <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full ml-auto">
          <Crown className="w-3 h-3" />
          Plus
        </span>
      </div>
    </div>
    <div className="p-6 text-center">
      <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
      <p className="text-sm font-medium mb-1">Live Weather Map</p>
      <p className="text-xs text-muted-foreground mb-3">
        Rain radar, temperature heatmap & wind layers with Rainz+.
      </p>
      <Button
        onClick={onUpgrade}
        size="sm"
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Upgrade to Rainz+ • €2/month
      </Button>
    </div>
  </div>
);

const RainMapCard: React.FC<RainMapCardProps> = ({ latitude, longitude, locationName }) => {
  const { isSubscribed, openCheckout } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  // All hooks must be declared before any conditional return
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [opacity, setOpacity] = useState(0.7);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>('rain');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpgrade = () => {
    if (!user) { navigate("/auth"); return; }
    void openCheckout().catch(() => {});
  };

  // Initialize map once (only when subscribed)
  useEffect(() => {
    if (!isSubscribed) return;
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 7,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'topleft' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  // Update map center on location change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 7);
    }
  }, [latitude, longitude]);

  // Fetch RainViewer radar frames
  useEffect(() => {
    if (!isSubscribed) return;
    const fetchRadarData = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        const frames: RadarFrame[] = [
          ...data.radar.past.map((f: { time: number; path: string }) => ({ time: f.time, path: f.path })),
          ...data.radar.nowcast.map((f: { time: number; path: string }) => ({ time: f.time, path: f.path })),
        ];
        setRadarFrames(frames);
        setCurrentFrameIndex(data.radar.past.length - 1);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch radar data:', error);
        setLoading(false);
      }
    };
    fetchRadarData();
    const interval = setInterval(fetchRadarData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSubscribed]);

  // Update overlay layer when mode / frame / opacity changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (radarLayerRef.current) {
      mapRef.current.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    if (mapMode === 'rain') {
      if (radarFrames.length === 0) return;
      const currentFrame = radarFrames[currentFrameIndex];
      if (!currentFrame) return;
      radarLayerRef.current = L.tileLayer(
        `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
        { opacity, zIndex: 1000 }
      );
      radarLayerRef.current.addTo(mapRef.current);
    } else {
      const config = MODE_CONFIG[mapMode];
      if (config.owmLayer) {
        radarLayerRef.current = L.tileLayer(owmTileUrl(config.owmLayer), {
          opacity,
          zIndex: 1000,
          attribution: '&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
        });
        radarLayerRef.current.addTo(mapRef.current);
      }
    }
  }, [currentFrameIndex, radarFrames, opacity, mapMode]);

  // Animation playback (rain only)
  useEffect(() => {
    if (isPlaying && mapMode === 'rain' && radarFrames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev >= radarFrames.length - 1 ? 0 : prev + 1));
      }, 500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, radarFrames.length, mapMode]);

  // Conditional render AFTER all hooks
  if (!isSubscribed) {
    return <LockedCard onUpgrade={handleUpgrade} />;
  }

  const formatTime = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const currentFrame = radarFrames[currentFrameIndex] || null;
  const isPast =
    radarFrames.length > 0 &&
    currentFrameIndex < radarFrames.findIndex((f) => f.time > Date.now() / 1000);

  const currentConfig = MODE_CONFIG[mapMode];

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Weather Map</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
          <MapPin className="h-3 w-3" />
          {locationName}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mt-3">
          {(['rain', 'temperature', 'wind'] as MapMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => { setMapMode(mode); setIsPlaying(false); }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${
                mapMode === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/50'
              }`}
            >
              {MODE_CONFIG[mode].label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[300px] md:h-[400px] w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Time indicator — rain */}
        {mapMode === 'rain' && currentFrame && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium z-[1000]">
            <span className={isPast ? 'text-muted-foreground' : 'text-primary'}>
              {isPast ? 'Past' : 'Forecast'}
            </span>
            <span className="ml-2">{formatTime(currentFrame.time)}</span>
          </div>
        )}

        {/* Mode label — temp/wind */}
        {mapMode !== 'rain' && (
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium z-[1000] flex items-center gap-1.5 text-foreground">
            {currentConfig.icon}
            <span>{mapMode === 'temperature' ? 'Temperature Heatmap' : 'Wind Speed Layer'}</span>
          </div>
        )}

        {/* Legend */}
        {currentConfig.legendItems && (
          <div className="absolute bottom-4 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 z-[1000]">
            <div className="text-xs font-medium mb-1 text-foreground">{currentConfig.legendTitle}</div>
            <div className="flex items-center gap-1">
              {currentConfig.legendItems.map((item) => (
                <div
                  key={item.label}
                  className="w-4 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                  title={item.label}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{currentConfig.legendItems[0].label}</span>
              <span>{currentConfig.legendItems[currentConfig.legendItems.length - 1].label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Playback controls — rain */}
      {mapMode === 'rain' && (
        <div className="p-4 space-y-3 border-t border-border/50">
          <div className="space-y-1">
            <Slider
              value={[currentFrameIndex]}
              min={0}
              max={Math.max(radarFrames.length - 1, 0)}
              step={1}
              onValueChange={(v) => { setCurrentFrameIndex(v[0]); setIsPlaying(false); }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{radarFrames[0] ? formatTime(radarFrames[0].time) : '--:--'}</span>
              <span>{radarFrames[radarFrames.length - 1] ? formatTime(radarFrames[radarFrames.length - 1].time) : '--:--'}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setCurrentFrameIndex(0); setIsPlaying(false); }} disabled={radarFrames.length === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={radarFrames.length === 0}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => { setCurrentFrameIndex(radarFrames.length - 1); setIsPlaying(false); }} disabled={radarFrames.length === 0}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Opacity</span>
            <Slider
              value={[opacity * 100]}
              min={20}
              max={100}
              step={10}
              onValueChange={(v) => setOpacity(v[0] / 100)}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Opacity control — temp/wind */}
      {mapMode !== 'rain' && (
        <div className="p-4 border-t border-border/50 flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Opacity</span>
          <Slider
            value={[opacity * 100]}
            min={20}
            max={100}
            step={10}
            onValueChange={(v) => setOpacity(v[0] / 100)}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
};

export default RainMapCard;
