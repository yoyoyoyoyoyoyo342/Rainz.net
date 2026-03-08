import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation2, Square, Umbrella, Clock, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import type { RouteResult, RouteStep } from './dry-route';
import { toast } from 'sonner';

interface DryRouteNavigationProps {
  route: RouteResult;
  isImperial: boolean;
  mapInstance: any;
  L: any;
  onStop: () => void;
}

const getManeuverIcon = (type: string, modifier?: string) => {
  if (type === 'turn') {
    if (modifier?.includes('left')) return <CornerUpLeft className="w-6 h-6" />;
    if (modifier?.includes('right')) return <CornerUpRight className="w-6 h-6" />;
  }
  if (modifier?.includes('left')) return <ArrowLeft className="w-6 h-6" />;
  if (modifier?.includes('right')) return <ArrowRight className="w-6 h-6" />;
  return <ArrowUp className="w-6 h-6" />;
};

export function DryRouteNavigation({ route, isImperial, mapInstance, L, onStop }: DryRouteNavigationProps) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [rainAlert, setRainAlert] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<any>(null);
  const lastSpokenStepRef = useRef(-1);
  const rainCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatDist = (meters: number) => {
    if (isImperial) {
      if (meters < 160) return `${Math.round(meters * 3.28084)} ft`;
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // Voice navigation
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Announce step changes
  useEffect(() => {
    if (currentStepIdx === lastSpokenStepRef.current) return;
    lastSpokenStepRef.current = currentStepIdx;
    const step = route.steps[currentStepIdx];
    if (step) {
      const dist = formatDist(step.distance);
      speak(`In ${dist}, ${step.instruction}`);
    }
  }, [currentStepIdx, route.steps, speak]);

  // Rain alerts - check every 2 minutes
  useEffect(() => {
    const checkRainAhead = async () => {
      if (!userPosition) return;
      try {
        const [lat, lon] = userPosition;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_hours=2&timezone=auto`
        );
        const data = await res.json();
        const probs = data?.hourly?.precipitation_probability || [];
        const maxProb = Math.max(...probs, 0);

        if (maxProb > 70) {
          const msg = `⚠️ Heavy rain ahead (${maxProb}%) — consider sheltering`;
          setRainAlert(msg);
          speak(`Warning: heavy rain expected ahead, ${maxProb} percent probability`);
          toast.warning(msg);
        } else if (maxProb > 40) {
          const msg = `🌧 Rain possible ahead (${maxProb}%)`;
          setRainAlert(msg);
        } else {
          setRainAlert(null);
        }
      } catch {
        // silent fail
      }
    };

    checkRainAhead();
    rainCheckIntervalRef.current = setInterval(checkRainAhead, 120000); // 2 min

    return () => {
      if (rainCheckIntervalRef.current) clearInterval(rainCheckIntervalRef.current);
    };
  }, [userPosition, speak]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Start watching position
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(newPos);
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Update map with user position
  useEffect(() => {
    if (!userPosition || !mapInstance || !L) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userPosition);
    } else {
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(217,91%,60%);border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.5)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(userPosition, { icon, zIndexOffset: 1000 }).addTo(mapInstance);
    }

    mapInstance.setView(userPosition, 16, { animate: true });
  }, [userPosition, mapInstance, L]);

  // Calculate distance to next step
  useEffect(() => {
    if (!userPosition || !route.steps[currentStepIdx]) return;

    const step = route.steps[currentStepIdx];
    const stepStart = step.geometry[0] || route.geometry[0];
    if (!stepStart) return;

    const R = 6371000;
    const dLat = ((stepStart[0] - userPosition[0]) * Math.PI) / 180;
    const dLon = ((stepStart[1] - userPosition[1]) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((userPosition[0] * Math.PI) / 180) *
      Math.cos((stepStart[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setDistanceToNext(dist);

    if (dist < 30 && currentStepIdx < route.steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  }, [userPosition, currentStepIdx, route]);

  const currentStep = route.steps[currentStepIdx];
  const nextStep = route.steps[currentStepIdx + 1];
  const remainingDuration = route.steps.slice(currentStepIdx).reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="space-y-2">
      {/* Rain alert banner */}
      {rainAlert && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{rainAlert}</span>
        </div>
      )}

      {/* Main instruction card */}
      <div className="bg-primary text-primary-foreground rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
            {currentStep && getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold capitalize truncate">
              {currentStep?.instruction || 'Calculating...'}
            </p>
            <p className="text-sm opacity-80">
              {distanceToNext !== null ? formatDist(distanceToNext) : '...'}
            </p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">{formatDuration(remainingDuration)}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-bold ${
          route.rainScore < 30 ? 'text-green-500' : route.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'
        }`}>
          <Umbrella className="w-3.5 h-3.5" />
          <span>{route.rainScore}% rain</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Navigation2 className="w-3.5 h-3.5" />
          <span>Step {currentStepIdx + 1}/{route.steps.length}</span>
        </div>
      </div>

      {/* Next step preview */}
      {nextStep && (
        <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
          <span className="text-[10px] uppercase font-medium">Then</span>
          <span className="capitalize truncate">{nextStep.instruction}</span>
          <span className="ml-auto shrink-0">{formatDist(nextStep.distance)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={voiceEnabled ? 'default' : 'outline'}
          className="text-xs"
          onClick={() => {
            setVoiceEnabled(!voiceEnabled);
            if (!voiceEnabled) {
              speak('Voice navigation enabled');
            } else {
              window.speechSynthesis?.cancel();
            }
          }}
        >
          {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </Button>
        <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={onStop}>
          <Square className="w-3.5 h-3.5 mr-1.5" />
          End Navigation
        </Button>
      </div>

      {/* GPS status */}
      <p className="text-[10px] text-center text-muted-foreground">
        {userPosition ? `📍 GPS active · ${userPosition[0].toFixed(4)}, ${userPosition[1].toFixed(4)}` : '⏳ Acquiring GPS...'}
      </p>
    </div>
  );
}
