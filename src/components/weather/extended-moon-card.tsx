import { useState, useEffect } from "react";
import { Moon, Sparkles, Calendar, Clock, Sun, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// Moon phase emoji mapping
const moonPhaseEmoji: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Third Quarter": "🌗",
  "Waning Crescent": "🌘",
};

// Calculate lunar cycle data
function getLunarCycleData(phase?: string) {
  const phases = [
    { name: "New Moon", daysFromNew: 0 },
    { name: "Waxing Crescent", daysFromNew: 3.7 },
    { name: "First Quarter", daysFromNew: 7.4 },
    { name: "Waxing Gibbous", daysFromNew: 11.1 },
    { name: "Full Moon", daysFromNew: 14.8 },
    { name: "Waning Gibbous", daysFromNew: 18.5 },
    { name: "Last Quarter", daysFromNew: 22.1 },
    { name: "Third Quarter", daysFromNew: 22.1 },
    { name: "Waning Crescent", daysFromNew: 25.8 },
  ];

  const currentPhase = phases.find(p => p.name === phase) || phases[0];
  const lunarCycleLength = 29.53;
  const daysUntilNextFull = phase?.includes("Waning") || phase === "Last Quarter" || phase === "Third Quarter"
    ? lunarCycleLength - currentPhase.daysFromNew + 14.8
    : 14.8 - currentPhase.daysFromNew;
  const daysUntilNewMoon = lunarCycleLength - currentPhase.daysFromNew;

  return {
    currentPhase: currentPhase.name,
    daysUntilFullMoon: Math.round(daysUntilNextFull < 0 ? daysUntilNextFull + lunarCycleLength : daysUntilNextFull),
    daysUntilNewMoon: Math.round(daysUntilNewMoon),
    cycleProgress: (currentPhase.daysFromNew / lunarCycleLength) * 100,
  };
}

// Get next 7 days moon phases (approximate)
function getUpcomingPhases(currentPhase?: string) {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const currentIndex = phases.findIndex(p => p === currentPhase) || 0;
  const upcoming: Array<{ day: string; phase: string; emoji: string }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    // Approximate phase progression (changes every ~3.7 days)
    const phaseOffset = Math.floor(i / 3.7);
    const phaseIndex = (currentIndex + phaseOffset) % phases.length;
    upcoming.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      phase: phases[phaseIndex],
      emoji: moonPhaseEmoji[phases[phaseIndex]] || "🌙",
    });
  }
  
  return upcoming;
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

  const lunarData = getLunarCycleData(moonPhase);
  const upcomingPhases = getUpcomingPhases(moonPhase);
  const phaseEmoji = moonPhaseEmoji[moonPhase || ""] || "🌙";
  const illumination = moonIllumination ?? (moonPhase === "Full Moon" ? 100 : moonPhase === "New Moon" ? 0 : 50);

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
          moonIllumination: illumination,
          latitude,
          longitude,
          moonrise, // Pass actual moonrise time
          moonset, // Pass actual moonset time
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

  const getDefaultInsights = (): MoonInsight[] => {
    const defaultInsights: MoonInsight[] = [
      {
        title: "Photography",
        description: moonPhase === "Full Moon" 
          ? "Perfect night for moonlit photography. Use a tripod for sharp moon shots."
          : "Good conditions for stargazing with less moonlight interference.",
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
    ];
    return defaultInsights;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden rounded-2xl shadow-xl border-0 mb-4">
          <div className="bg-gradient-to-r from-indigo-900/80 via-purple-900/70 to-slate-900/80 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{phaseEmoji}</span>
                <div>
                  <h3 className="font-semibold text-white text-lg">{moonPhase || "Moon"}</h3>
                  <p className="text-sm text-white/70">{illumination}% illuminated</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI Insights</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <CardContent className="bg-background/60 backdrop-blur-md p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Moonrise</p>
                  <p className="font-semibold text-sm">{formatTime(moonrise, is24Hour)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-slate-400" />
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
              <p className="text-sm font-normal text-muted-foreground">{illumination}% Illuminated</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Moon Illumination Visual */}
          <div className="relative flex justify-center">
            <div className="relative w-32 h-32">
              {/* Moon base */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 shadow-2xl" />
              {/* Shadow overlay for phase */}
              <div 
                className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-900/90 to-transparent"
                style={{
                  clipPath: `inset(0 ${illumination}% 0 0)`,
                }}
              />
              {/* Moon glow */}
              <div className="absolute -inset-2 rounded-full bg-purple-500/20 blur-xl -z-10" />
            </div>
          </div>

          {/* Lunar Cycle Progress */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Lunar Cycle
            </h4>
            <div className="space-y-3">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-slate-600 via-purple-500 to-slate-600 rounded-full transition-all"
                  style={{ width: `${lunarData.cycleProgress}%` }}
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
                  <p className="text-2xl font-bold">{lunarData.daysUntilFullMoon}</p>
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
              Moon Times
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moonrise</p>
                  <p className="font-bold">{formatTime(moonrise, is24Hour)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moonset</p>
                  <p className="font-bold">{formatTime(moonset, is24Hour)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Moon Forecast */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-3">7-Day Moon Forecast</h4>
            <div className="flex justify-between">
              {upcomingPhases.map((day, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{day.day}</p>
                  <span className="text-2xl">{day.emoji}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Moon Insights */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
