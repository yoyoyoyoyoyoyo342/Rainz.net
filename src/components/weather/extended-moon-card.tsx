import { useState, useEffect } from "react";
import { Moon, Sparkles, Calendar, Clock, ChevronRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/lib/time-format";

interface ExtendedMoonCardProps {
  moonrise?: string;
  moonset?: string;
  moonPhase?: string;
  moonIllumination?: number;
  latitude: number;
  longitude: number;
  is24Hour?: boolean;
}

interface MoonInsight {
  title: string;
  description: string;
  icon: string;
}

// Moon phase to days in cycle mapping (more accurate)
const moonPhaseData: Record<string, { daysFromNew: number; emoji: string }> = {
  "New Moon": { daysFromNew: 0, emoji: "🌑" },
  "Waxing Crescent": { daysFromNew: 3.7, emoji: "🌒" },
  "First Quarter": { daysFromNew: 7.4, emoji: "🌓" },
  "Waxing Gibbous": { daysFromNew: 11.1, emoji: "🌔" },
  "Full Moon": { daysFromNew: 14.8, emoji: "🌕" },
  "Waning Gibbous": { daysFromNew: 18.5, emoji: "🌖" },
  "Last Quarter": { daysFromNew: 22.1, emoji: "🌗" },
  "Third Quarter": { daysFromNew: 22.1, emoji: "🌗" },
  "Waning Crescent": { daysFromNew: 25.8, emoji: "🌘" },
};

// Calculate accurate illumination based on phase
function calculateIllumination(phase: string): number {
  const phaseInfo = moonPhaseData[phase];
  if (!phaseInfo) return 50;
  
  const daysFromNew = phaseInfo.daysFromNew;
  const lunarCycleLength = 29.53;
  
  // Illumination follows a sinusoidal pattern
  // 0% at new moon, 100% at full moon
  const phaseAngle = (daysFromNew / lunarCycleLength) * 2 * Math.PI;
  const illumination = Math.round(((1 - Math.cos(phaseAngle)) / 2) * 100);
  
  return illumination;
}

// Calculate lunar cycle data
function getLunarCycleData(phase?: string, illumination?: number) {
  const phaseInfo = moonPhaseData[phase || "New Moon"] || moonPhaseData["New Moon"];
  const lunarCycleLength = 29.53;
  
  const daysFromNew = phaseInfo.daysFromNew;
  const daysUntilFull = daysFromNew < 14.8 ? 14.8 - daysFromNew : lunarCycleLength - daysFromNew + 14.8;
  const daysUntilNew = lunarCycleLength - daysFromNew;
  
  return {
    currentPhase: phase || "Unknown",
    daysUntilFullMoon: Math.round(daysUntilFull),
    daysUntilNewMoon: Math.round(daysUntilNew),
    cycleProgress: (daysFromNew / lunarCycleLength) * 100,
    daysIntoPhase: Math.round(daysFromNew),
    lunarAge: Math.round(daysFromNew),
  };
}

// Get next 7 days moon phases (approximate)
function getUpcomingPhases(currentPhase?: string) {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const currentIndex = phases.findIndex(p => p === currentPhase) || 0;
  const upcoming: Array<{ day: string; phase: string; emoji: string; illumination: number }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    // Approximate phase progression (changes every ~3.7 days)
    const phaseOffset = Math.floor(i / 3.7);
    const phaseIndex = (currentIndex + phaseOffset) % phases.length;
    const phaseName = phases[phaseIndex];
    upcoming.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      phase: phaseName,
      emoji: moonPhaseData[phaseName]?.emoji || "🌙",
      illumination: calculateIllumination(phaseName),
    });
  }
  
  return upcoming;
}

// Render accurate moon phase visualization
function MoonVisualization({ illumination, phase }: { illumination: number; phase?: string }) {
  const isWaxing = phase?.includes("Waxing") || phase === "First Quarter";
  const isWaning = phase?.includes("Waning") || phase === "Last Quarter" || phase === "Third Quarter";
  
  // Calculate shadow position based on illumination and phase
  let shadowStyle = {};
  
  if (illumination <= 0) {
    // New moon - fully dark
    shadowStyle = { background: 'hsl(var(--muted))' };
  } else if (illumination >= 100) {
    // Full moon - fully lit
    shadowStyle = { background: 'transparent' };
  } else if (isWaxing) {
    // Waxing: lit from right, shadow on left shrinking
    const shadowWidth = 100 - illumination;
    shadowStyle = {
      background: `linear-gradient(to right, hsl(var(--muted)) ${shadowWidth}%, transparent ${shadowWidth}%)`,
    };
  } else if (isWaning) {
    // Waning: shadow from right growing
    const shadowWidth = 100 - illumination;
    shadowStyle = {
      background: `linear-gradient(to left, hsl(var(--muted)) ${shadowWidth}%, transparent ${shadowWidth}%)`,
    };
  } else {
    // Default quarter phases
    shadowStyle = {
      background: `linear-gradient(to ${phase?.includes("First") ? "left" : "right"}, hsl(var(--muted)) 50%, transparent 50%)`,
    };
  }
  
  return (
    <div className="relative w-28 h-28 mx-auto">
      {/* Moon glow effect */}
      <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl" />
      
      {/* Moon base (lit portion) */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 shadow-lg" />
      
      {/* Moon surface details */}
      <div className="absolute inset-0 rounded-full opacity-30">
        <div className="absolute w-4 h-4 rounded-full bg-slate-400/50 top-4 left-6" />
        <div className="absolute w-6 h-6 rounded-full bg-slate-400/40 top-12 left-4" />
        <div className="absolute w-3 h-3 rounded-full bg-slate-400/50 top-8 right-6" />
        <div className="absolute w-5 h-5 rounded-full bg-slate-400/30 bottom-6 right-4" />
      </div>
      
      {/* Shadow overlay */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={shadowStyle}
      />
      
      {/* Illumination percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-700 drop-shadow-sm">{illumination}%</span>
      </div>
    </div>
  );
}

export function ExtendedMoonCard({
  moonrise,
  moonset,
  moonPhase,
  moonIllumination,
  latitude,
  longitude,
  is24Hour = true,
}: ExtendedMoonCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<MoonInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Calculate real illumination if not provided
  const realIllumination = moonIllumination ?? calculateIllumination(moonPhase || "New Moon");
  const lunarData = getLunarCycleData(moonPhase, realIllumination);
  const upcomingPhases = getUpcomingPhases(moonPhase);
  const phaseEmoji = moonPhaseData[moonPhase || ""]?.emoji || "🌙";

  // Fetch AI moon insights when dialog opens
  useEffect(() => {
    if (isOpen && insights.length === 0) {
      fetchMoonInsights();
    }
  }, [isOpen]);

  const fetchMoonInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-moon-insights', {
        body: {
          moonPhase,
          moonIllumination: realIllumination,
          latitude,
          longitude,
          moonrise,
          moonset,
        },
      });

      if (error) throw error;
      setInsights(data?.insights || getDefaultInsights());
    } catch (err) {
      console.error('Failed to fetch moon insights:', err);
      setInsights(getDefaultInsights());
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const getDefaultInsights = (): MoonInsight[] => [
    {
      title: "Photography",
      description: `${realIllumination}% illumination ${realIllumination > 70 ? 'provides great moonlight for night photography' : 'offers good stargazing conditions'}.`,
      icon: "📷",
    },
    {
      title: "Gardening",
      description: moonPhase?.includes("Waxing")
        ? "Waxing moon is ideal for planting above-ground crops."
        : "Waning moon favors root vegetables and pruning.",
      icon: "🌱",
    },
    {
      title: "Sleep Quality",
      description: moonPhase === "Full Moon"
        ? "Full moon may affect sleep. Consider darkening curtains."
        : "Moon phase unlikely to significantly impact sleep tonight.",
      icon: "😴",
    },
    {
      title: "Outdoor Activities",
      description: realIllumination > 50 
        ? "Good moonlight for evening walks or night activities."
        : "Lower light conditions - ideal for stargazing.",
      icon: "🏃",
    },
    {
      title: "Lunar Traditions",
      description: `The ${moonPhase || 'current phase'} has been associated with reflection and renewal in many cultures.`,
      icon: "✨",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden rounded-2xl glass-card mb-4">
          {/* Card content without gradient header */}
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">{phaseEmoji}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{moonPhase || "Moon"}</h3>
                  <p className="text-sm text-muted-foreground">{realIllumination}% illuminated</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm">AI Insights</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Moon className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Moonrise</p>
                  <p className="font-semibold text-sm">{formatTime(moonrise, is24Hour)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Moon className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Moonset</p>
                  <p className="font-semibold text-sm">{formatTime(moonset, is24Hour)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{phaseEmoji}</span>
            <div>
              <span className="text-xl">{moonPhase || "Moon Phase"}</span>
              <p className="text-sm font-normal text-muted-foreground">Lunar Age: Day {lunarData.lunarAge} of 29.5</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Moon Illumination Visual - Real shape */}
          <div className="py-4">
            <MoonVisualization illumination={realIllumination} phase={moonPhase} />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {moonPhase} • {realIllumination}% Illuminated
            </p>
          </div>

          {/* Lunar Cycle Progress */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Lunar Cycle Progress
            </h4>
            <div className="space-y-3">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-slate-600 via-primary to-slate-600 rounded-full transition-all"
                  style={{ width: `${lunarData.cycleProgress}%` }}
                />
                {/* Moon position indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-card border-2 border-primary rounded-full shadow"
                  style={{ left: `calc(${lunarData.cycleProgress}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🌑 New</span>
                <span>🌓 First Qtr</span>
                <span>🌕 Full</span>
                <span>🌗 Last Qtr</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-primary">{lunarData.daysUntilFullMoon}</p>
                  <p className="text-xs text-muted-foreground">days until Full Moon</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold">{lunarData.daysUntilNewMoon}</p>
                  <p className="text-xs text-muted-foreground">days until New Moon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rise and Set Times */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Moon Times Today
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moonrise</p>
                  <p className="font-bold">{formatTime(moonrise, is24Hour)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moonset</p>
                  <p className="font-bold">{formatTime(moonset, is24Hour)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Moon Forecast with illumination */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-3">7-Day Moon Forecast</h4>
            <div className="flex justify-between">
              {upcomingPhases.map((day, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{day.day}</p>
                  <span className="text-2xl">{day.emoji}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">{day.illumination}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Moon Insights */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Moon Insights
            </h4>
            {isLoadingInsights ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex gap-3 p-2 bg-background/50 rounded-lg">
                    <span className="text-2xl">{insight.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data source note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Moon data calculated based on astronomical formulas. Illumination and phase timings are approximations based on the 29.53-day lunar cycle.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
