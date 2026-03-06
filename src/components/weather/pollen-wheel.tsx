import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Trash2, Plus, AlertTriangle, Settings2, Leaf } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

interface PollenData {
  alder: number;
  birch: number;
  grass: number;
  mugwort: number;
  olive: number;
  ragweed: number;
}

interface UserAllergy {
  id: string;
  allergen: string;
  severity: string;
  pollen_type: string | null;
}

interface ExtendedPollenEntry {
  value: number;
  category: string;
  type: string;
}

interface PollenWheelProps {
  pollenData?: PollenData;
  userId?: string;
  latitude?: number;
  longitude?: number;
}

const POLLEN_ALLERGENS = [
  { name: "Alder", pollenType: "alder", color: "hsl(25, 95%, 53%)", key: "alder" as keyof PollenData },
  { name: "Birch", pollenType: "birch", color: "hsl(142, 71%, 45%)", key: "birch" as keyof PollenData },
  { name: "Grass", pollenType: "grass", color: "hsl(120, 60%, 50%)", key: "grass" as keyof PollenData },
  { name: "Mugwort", pollenType: "mugwort", color: "hsl(280, 70%, 55%)", key: "mugwort" as keyof PollenData },
  { name: "Olive", pollenType: "olive", color: "hsl(47, 96%, 53%)", key: "olive" as keyof PollenData },
  { name: "Ragweed", pollenType: "ragweed", color: "hsl(15, 80%, 50%)", key: "ragweed" as keyof PollenData },
];

// Extended types from Tomorrow.io (not in Open-Meteo)
const EXTENDED_ALLERGENS = [
  { name: "Oak", pollenType: "oak", color: "hsl(30, 60%, 40%)" },
  { name: "Pine", pollenType: "pine", color: "hsl(150, 50%, 35%)" },
  { name: "Cedar", pollenType: "cedar", color: "hsl(20, 70%, 45%)" },
  { name: "Elm", pollenType: "elm", color: "hsl(90, 40%, 45%)" },
  { name: "Maple", pollenType: "maple", color: "hsl(10, 80%, 55%)" },
  { name: "Ash", pollenType: "ash", color: "hsl(200, 30%, 50%)" },
  { name: "Cypress", pollenType: "cypress", color: "hsl(160, 50%, 40%)" },
  { name: "Hazel", pollenType: "hazel", color: "hsl(35, 65%, 50%)" },
  { name: "Poplar", pollenType: "poplar", color: "hsl(100, 50%, 50%)" },
  { name: "Willow", pollenType: "willow", color: "hsl(80, 55%, 45%)" },
  { name: "Plane", pollenType: "plane", color: "hsl(45, 40%, 50%)" },
  { name: "Acacia", pollenType: "acacia", color: "hsl(50, 70%, 50%)" },
  { name: "Chenopod", pollenType: "chenopod", color: "hsl(340, 50%, 50%)" },
];

const ALL_ALLERGENS = [...POLLEN_ALLERGENS.map(a => ({ name: a.name, pollenType: a.pollenType, color: a.color })), ...EXTENDED_ALLERGENS];

const MIN_ARC_DEG = 15;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  const os = polarToCartesian(cx, cy, outerR, startDeg);
  const oe = polarToCartesian(cx, cy, outerR, endDeg);
  const is_ = polarToCartesian(cx, cy, innerR, endDeg);
  const ie = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oe.x} ${oe.y}`,
    `L ${is_.x} ${is_.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ie.x} ${ie.y}`,
    "Z",
  ].join(" ");
}

export function PollenWheel({ pollenData, userId, latitude, longitude }: PollenWheelProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const activeUserId = userId || user?.id;
  const [userAllergies, setUserAllergies] = useState<UserAllergy[]>([]);
  // Use a separate "committed" allergies list for the wheel so drawer interactions don't flash the SVG
  const [committedAllergies, setCommittedAllergies] = useState<UserAllergy[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newSeverity, setNewSeverity] = useState("moderate");
  const [customAllergen, setCustomAllergen] = useState("");
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [extendedPollen, setExtendedPollen] = useState<Record<string, ExtendedPollenEntry>>({});
  const [extendedLoading, setExtendedLoading] = useState(false);

  const extendedFetchedRef = useRef<string>("");

  const fetchUserAllergies = useCallback(async () => {
    if (!activeUserId) return;
    const { data, error } = await supabase
      .from('user_allergies')
      .select('*')
      .eq('user_id', activeUserId);
    if (error) { console.error('Error fetching allergies:', error); return; }
    const allergies = (data as UserAllergy[]) || [];
    setUserAllergies(allergies);
    setCommittedAllergies(allergies);
  }, [activeUserId]);

  // When drawer closes, sync committed allergies so wheel updates only then
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setCommittedAllergies(userAllergies);
    }
  }, [userAllergies]);

  useEffect(() => {
    if (activeUserId) fetchUserAllergies();
  }, [activeUserId, fetchUserAllergies]);

  // Fetch extended pollen data only when the set of extended allergen types actually changes
  const extendedAllergenKeys = userAllergies
    .filter(a => a.pollen_type && !POLLEN_ALLERGENS.some(p => p.pollenType === a.pollen_type))
    .map(a => a.pollen_type)
    .sort()
    .join(",");

  useEffect(() => {
    if (!latitude || !longitude || !extendedAllergenKeys) return;
    // Only refetch if the set of extended types changed
    if (extendedFetchedRef.current === extendedAllergenKeys) return;
    extendedFetchedRef.current = extendedAllergenKeys;

    let cancelled = false;
    const fetchExtended = async () => {
      // Only show loading if we have no data yet (avoid flash on subsequent adds)
      if (Object.keys(extendedPollen).length === 0) {
        setExtendedLoading(true);
      }
      try {
        const { data, error } = await supabase.functions.invoke('extended-pollen', {
          body: { latitude, longitude },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.pollen) {
          setExtendedPollen(prev => ({ ...prev, ...data.pollen }));
        }
      } catch (err) {
        console.error('Extended pollen fetch failed:', err);
      } finally {
        if (!cancelled) setExtendedLoading(false);
      }
    };
    fetchExtended();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendedAllergenKeys, latitude, longitude]);

  const addAllergen = async (allergenName: string, pollenType: string) => {
    if (!activeUserId) return;
    if (userAllergies.some(a => a.pollen_type === pollenType || a.allergen.toLowerCase() === allergenName.toLowerCase())) {
      toast.error(t('pollen.alreadyTracked'));
      return;
    }
    const { error } = await supabase.from('user_allergies').insert({
      user_id: activeUserId,
      allergen: allergenName,
      severity: newSeverity,
      pollen_type: pollenType,
    });
    if (error) { toast.error(t('pollen.addFailed')); return; }
    toast.success(t('pollen.addSuccess'));
    // Optimistically add to state to avoid full refetch cascade
    setUserAllergies(prev => [...prev, {
      id: crypto.randomUUID(),
      allergen: allergenName,
      severity: newSeverity,
      pollen_type: pollenType,
    }]);
  };

  const addCustomAllergy = async () => {
    if (!activeUserId || !customAllergen.trim()) return;
    const { error } = await supabase.from('user_allergies').insert({
      user_id: activeUserId,
      allergen: customAllergen.trim(),
      severity: newSeverity,
      pollen_type: null,
    });
    if (error) {
      if (error.code === '23505') toast.error(t('pollen.alreadyTracked'));
      else toast.error(t('pollen.addFailed'));
      return;
    }
    toast.success(t('pollen.addSuccess'));
    const savedName = customAllergen.trim();
    setCustomAllergen("");
    setUserAllergies(prev => [...prev, {
      id: crypto.randomUUID(),
      allergen: savedName,
      severity: newSeverity,
      pollen_type: null,
    }]);
  };

  const removeAllergy = async (id: string) => {
    // Optimistic removal
    setUserAllergies(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('user_allergies').delete().eq('id', id);
    if (error) {
      toast.error(t('pollen.removeFailed'));
      fetchUserAllergies(); // Revert on error
      return;
    }
    toast.success(t('pollen.removeSuccess'));
  };

  if (!pollenData) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div>{t('pollen.noData')}</div>
        <div className="text-xs mt-1">{t('pollen.locationRequired')}</div>
      </div>
    );
  }

  const getIntensityLabel = (value: number) => {
    if (value === 0) return t('pollen.noRisk');
    if (value <= 2) return t('pollen.low');
    if (value <= 5) return t('pollen.medium');
    if (value <= 8) return t('pollen.high');
    return t('pollen.veryHigh');
  };

  const getIntensityColor = (value: number): string => {
    if (value === 0) return "text-muted-foreground";
    if (value <= 2) return "text-blue-500";
    if (value <= 5) return "text-yellow-500";
    if (value <= 8) return "text-orange-500";
    return "text-red-500";
  };

  // Get value for any tracked allergen (from Open-Meteo or Tomorrow.io)
  const getPollenValue = (pollenType: string): number | null => {
    // Check Open-Meteo data first
    const openMeteoAllergen = POLLEN_ALLERGENS.find(a => a.pollenType === pollenType);
    if (openMeteoAllergen && pollenData) {
      return pollenData[openMeteoAllergen.key] || 0;
    }
    // Check Tomorrow.io extended data
    const extAllergen = EXTENDED_ALLERGENS.find(a => a.pollenType === pollenType);
    if (extAllergen && extendedPollen[extAllergen.name]) {
      return extendedPollen[extAllergen.name].value;
    }
    return null;
  };

  // For wheel rendering, use committedAllergies to avoid flashing
  const wheelAllergies = drawerOpen ? committedAllergies : userAllergies;

  const isTracked = (pollenType: string) =>
    userAllergies.some(a => a.pollen_type === pollenType);

  const isTrackedForWheel = (pollenType: string) =>
    wheelAllergies.some(a => a.pollen_type === pollenType);

  const getAlertForSegment = (pollenType: string, value: number): boolean => {
    const allergy = wheelAllergies.find(a => a.pollen_type === pollenType);
    if (!allergy || value === 0) return false;
    if (allergy.severity === 'severe' && value > 0) return true;
    if (allergy.severity === 'moderate' && value > 2) return true;
    if (allergy.severity === 'mild' && value > 5) return true;
    return false;
  };

  // Build segments — Open-Meteo base + tracked extended types
  const baseSegments = POLLEN_ALLERGENS.map(a => ({
    name: a.name,
    pollenType: a.pollenType,
    color: a.color,
    value: pollenData[a.key] || 0,
  }));

  // Add extended segments for tracked extended allergens with data
  const extendedSegments = userAllergies
    .filter(a => a.pollen_type && !POLLEN_ALLERGENS.some(p => p.pollenType === a.pollen_type))
    .map(a => {
      const extInfo = EXTENDED_ALLERGENS.find(e => e.pollenType === a.pollen_type);
      const value = extInfo && extendedPollen[extInfo.name] ? extendedPollen[extInfo.name].value : 0;
      return {
        name: extInfo?.name || a.allergen,
        pollenType: a.pollen_type!,
        color: extInfo?.color || "hsl(0, 0%, 50%)",
        value,
      };
    });

  const segments = [...baseSegments, ...extendedSegments];

  const totalValue = segments.reduce((s, seg) => s + Math.max(seg.value, 0.5), 0);

  const rawAngles = segments.map(seg => Math.max(MIN_ARC_DEG, ((Math.max(seg.value, 0.5)) / totalValue) * 360));
  const rawTotal = rawAngles.reduce((s, a) => s + a, 0);
  const normalizedAngles = rawAngles.map(a => (a / rawTotal) * 360);

  const overallValue = Math.round(segments.reduce((s, seg) => s + seg.value, 0) / segments.length);
  const overallLevel = getIntensityLabel(overallValue);
  const alertCount = segments.filter(seg => getAlertForSegment(seg.pollenType, seg.value)).length;

  const cx = 100, cy = 100, outerR = 90, innerR = 55;

  let currentAngle = 0;
  const paths = segments.map((seg, i) => {
    const start = currentAngle;
    const end = currentAngle + normalizedAngles[i];
    currentAngle = end;
    const tracked = isTracked(seg.pollenType);
    const alert = getAlertForSegment(seg.pollenType, seg.value);
    const hovered = hoveredSegment === seg.pollenType;
    return { seg, start, end, tracked, alert, hovered };
  });

  const trackedNonPollen = userAllergies.filter(a => !a.pollen_type);

  const severityDesc: Record<string, string> = {
    mild: "Alert when high (above 5)",
    moderate: "Alert when moderate+ (above 2)",
    severe: "Alert at any level (above 0)",
  };

  return (
    <div className="space-y-4">
      {/* SVG Donut Wheel */}
      <div className="flex justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
          <defs>
            <style>{`
              @keyframes pollenPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
              }
              .pollen-pulse { animation: pollenPulse 1.5s ease-in-out infinite; }
            `}</style>
          </defs>
          {paths.map(({ seg, start, end, tracked, alert, hovered }) => (
            <g key={seg.pollenType}>
              <path
                d={describeArc(cx, cy, hovered ? outerR + 4 : outerR, innerR, start, end - 0.5)}
                fill={seg.color}
                stroke={tracked ? "hsl(var(--foreground))" : "hsl(var(--background))"}
                strokeWidth={tracked ? 3 : 1}
                className={alert ? "pollen-pulse" : ""}
                style={{
                  cursor: "pointer",
                  filter: tracked ? `drop-shadow(0 0 4px ${seg.color})` : undefined,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={() => setHoveredSegment(seg.pollenType)}
                onMouseLeave={() => setHoveredSegment(null)}
                onTouchStart={() => setHoveredSegment(seg.pollenType === hoveredSegment ? null : seg.pollenType)}
              />
            </g>
          ))}
          {/* Center text */}
          <circle cx={cx} cy={cy} r={innerR - 4} fill="hsl(var(--background))" opacity="0.9" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground" fontSize="28" fontWeight="bold">
            {overallValue}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="11">
            {overallLevel}
          </text>
          {alertCount > 0 && (
            <text x={cx} y={cy + 28} textAnchor="middle" className="fill-destructive" fontSize="10" fontWeight="600">
              ⚠ {alertCount} alert{alertCount > 1 ? "s" : ""}
            </text>
          )}
        </svg>
      </div>

      {/* Tooltip / hovered info */}
      {hoveredSegment && (() => {
        const seg = segments.find(s => s.pollenType === hoveredSegment);
        if (!seg) return null;
        return (
          <div className="text-center text-xs text-muted-foreground -mt-2 mb-1">
            <span className="font-semibold text-foreground">{seg.name}</span>{" "}
            — {seg.value} ({getIntensityLabel(seg.value)})
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
        {segments.map(seg => {
          const tracked = isTracked(seg.pollenType);
          return (
            <div key={seg.pollenType} className={`flex items-center gap-1 ${tracked ? "font-semibold" : ""}`}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground">{seg.name}</span>
              <span className={getIntensityColor(seg.value)}>{seg.value}</span>
            </div>
          );
        })}
      </div>

      {/* Manage Allergies Drawer */}
      {activeUserId && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="w-full rounded-xl">
              <Settings2 className="w-4 h-4 mr-1" />
              {t('pollen.trackAllergy')}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>{t('pollen.addAllergy')}</DrawerTitle>
            </DrawerHeader>
            <div data-vaul-no-drag className="px-4 pb-6 space-y-5 overflow-y-auto flex-1 min-h-0 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {/* Severity picker */}
              <div>
                <Label className="text-sm font-medium">{t('pollen.sensitivityLevel')}</Label>
                <Select value={newSeverity} onValueChange={setNewSeverity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">{t('pollen.mild')} — {severityDesc.mild}</SelectItem>
                    <SelectItem value="moderate">{t('pollen.moderate')} — {severityDesc.moderate}</SelectItem>
                    <SelectItem value="severe">{t('pollen.severe')} — {severityDesc.severe}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Open-Meteo pollen chips */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  <Leaf className="w-3.5 h-3.5 inline mr-1" />
                  Open-Meteo Pollen (Real-time)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {POLLEN_ALLERGENS.map(allergen => {
                    const alreadyTracked = isTracked(allergen.pollenType);
                    const value = pollenData[allergen.key] || 0;
                    return (
                      <button
                        key={allergen.pollenType}
                        disabled={alreadyTracked}
                        onClick={(e) => { e.stopPropagation(); addAllergen(allergen.name, allergen.pollenType); }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-colors ${
                          alreadyTracked
                            ? "border-primary/30 bg-primary/10 opacity-60 cursor-not-allowed"
                            : "border-border/50 bg-muted/30 hover:bg-muted/60 cursor-pointer"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: allergen.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{allergen.name}</div>
                          <div className={`text-xs ${getIntensityColor(value)}`}>{getIntensityLabel(value)} ({value})</div>
                        </div>
                        {alreadyTracked ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5">✓</Badge>
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extended pollen chips (Tomorrow.io) */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  <Leaf className="w-3.5 h-3.5 inline mr-1" />
                  Extended Pollen Types (Tomorrow.io)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {EXTENDED_ALLERGENS.map(allergen => {
                    const alreadyTracked = isTracked(allergen.pollenType);
                    const extData = extendedPollen[allergen.name];
                    const value = extData?.value ?? null;
                    return (
                      <button
                        key={allergen.pollenType}
                        disabled={alreadyTracked}
                        onClick={(e) => { e.stopPropagation(); addAllergen(allergen.name, allergen.pollenType); }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-colors ${
                          alreadyTracked
                            ? "border-primary/30 bg-primary/10 opacity-60 cursor-not-allowed"
                            : "border-border/50 bg-muted/30 hover:bg-muted/60 cursor-pointer"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: allergen.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{allergen.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {value !== null ? `${extData?.category} (${value})` : "Track to load"}
                          </div>
                        </div>
                        {alreadyTracked ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5">✓</Badge>
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom allergen */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Other Allergens (no live data)</Label>
                <div className="flex gap-2">
                  <Input
                    value={customAllergen}
                    onChange={(e) => setCustomAllergen(e.target.value)}
                    placeholder="e.g. Dust, Mold, Pet dander..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addCustomAllergy} disabled={!customAllergen.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Current tracked list */}
              {userAllergies.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('pollen.yourTracked')}</Label>
                  <div className="space-y-2">
                    {userAllergies.map(allergy => {
                      const pollenInfo = ALL_ALLERGENS.find(a => a.pollenType === allergy.pollen_type);
                      const value = allergy.pollen_type ? getPollenValue(allergy.pollen_type) : null;
                      return (
                        <div key={allergy.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/30">
                          {pollenInfo && (
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pollenInfo.color }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{allergy.allergen}</div>
                            <div className="text-xs text-muted-foreground">
                              {allergy.severity} sensitivity
                              {value !== null && ` · ${getIntensityLabel(value)} (${value})`}
                              {!pollenInfo && " · Custom"}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeAllergy(allergy.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
