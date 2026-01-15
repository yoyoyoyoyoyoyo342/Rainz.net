import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Play, Pause, SkipBack, SkipForward, CloudRain, Lock, Crown, Sparkles } from 'lucide-react';
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

const RainMapCard: React.FC<RainMapCardProps> = ({
  latitude,
  longitude,
  locationName,
}) => {
  const { isSubscribed, openCheckout } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [opacity, setOpacity] = useState(0.7);
  const [loading, setLoading] = useState(true);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpgrade = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    void openCheckout().catch(() => {});
  };

  // Plus-only feature
  if (!isSubscribed) {
    return (
      <div className="overflow-hidden rounded-2xl glass-card border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Rain Radar</h3>
            <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full ml-auto">
              <Crown className="w-3 h-3" />
              Plus
            </span>
          </div>
        </div>
        <div className="p-6 text-center">
          <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Live Rain Radar</p>
          <p className="text-xs text-muted-foreground mb-3">
            View animated precipitation forecasts with Rainz+.
          </p>
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Rainz+ • €2/month
          </Button>
        </div>
      </div>
    );
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 8,
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
  }, []);

  // Update map center when location changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 8);
    }
  }, [latitude, longitude]);

  // Fetch radar data from RainViewer API
  useEffect(() => {
    const fetchRadarData = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        
        const frames: RadarFrame[] = [
          ...data.radar.past.map((frame: { time: number; path: string }) => ({
            time: frame.time,
            path: frame.path,
          })),
          ...data.radar.nowcast.map((frame: { time: number; path: string }) => ({
            time: frame.time,
            path: frame.path,
          })),
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
    
    const refreshInterval = setInterval(fetchRadarData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Update radar layer when frame changes
  useEffect(() => {
    if (!mapRef.current || radarFrames.length === 0) return;

    const currentFrame = radarFrames[currentFrameIndex];
    if (!currentFrame) return;

    if (radarLayerRef.current) {
      mapRef.current.removeLayer(radarLayerRef.current);
    }

    radarLayerRef.current = L.tileLayer(
      `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
      {
        opacity: opacity,
        zIndex: 1000,
      }
    );
    radarLayerRef.current.addTo(mapRef.current);
  }, [currentFrameIndex, radarFrames, opacity]);

  // Animation playback
  useEffect(() => {
    if (isPlaying && radarFrames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          if (prev >= radarFrames.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, radarFrames.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentFrame = radarFrames[currentFrameIndex] || null;
  const isPast = radarFrames.length > 0 && currentFrameIndex < radarFrames.findIndex(f => f.time > Date.now() / 1000);

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      {/* Header without gradient */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Rain Radar</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
          <MapPin className="h-3 w-3" />
          {locationName}
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[300px] md:h-[400px] w-full">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : null}
        
        <div ref={mapContainerRef} className="h-full w-full" />
        
        {/* Time indicator */}
        {currentFrame && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium z-[1000]">
            <span className={isPast ? 'text-muted-foreground' : 'text-primary'}>
              {isPast ? 'Past' : 'Forecast'}
            </span>
            <span className="ml-2">{formatTime(currentFrame.time)}</span>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-16 right-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 z-[1000]">
          <div className="text-xs font-medium mb-1">Intensity</div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#88DDFF' }}></div>
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#00FF00' }}></div>
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#FFFF00' }}></div>
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#FF8800' }}></div>
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#FF0000' }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Light</span>
            <span>Heavy</span>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="p-4 space-y-3 border-t border-border/50">
        {/* Timeline slider */}
        <div className="space-y-1">
          <Slider
            value={[currentFrameIndex]}
            min={0}
            max={Math.max(radarFrames.length - 1, 0)}
            step={1}
            onValueChange={(value) => {
              setCurrentFrameIndex(value[0]);
              setIsPlaying(false);
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{radarFrames[0] ? formatTime(radarFrames[0].time) : '--:--'}</span>
            <span>{radarFrames[radarFrames.length - 1] ? formatTime(radarFrames[radarFrames.length - 1].time) : '--:--'}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setCurrentFrameIndex(0);
              setIsPlaying(false);
            }}
            disabled={radarFrames.length === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={radarFrames.length === 0}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setCurrentFrameIndex(radarFrames.length - 1);
              setIsPlaying(false);
            }}
            disabled={radarFrames.length === 0}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Opacity control */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Opacity</span>
          <Slider
            value={[opacity * 100]}
            min={20}
            max={100}
            step={10}
            onValueChange={(value) => setOpacity(value[0] / 100)}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export default RainMapCard;
