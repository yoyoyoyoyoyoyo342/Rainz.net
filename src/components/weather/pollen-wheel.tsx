import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
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
}

interface PollenWheelProps {
  pollenData?: PollenData;
  userId?: string;
}

interface SeasonalPollen {
  name: string;
  value: number;
  color: string;
  months: number[];
  season: string;
}

const SEVERITY_LEVELS = ['mild', 'moderate', 'severe'];

export function PollenWheel({ pollenData, userId }: PollenWheelProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const activeUserId = userId || user?.id;
  const [userAllergies, setUserAllergies] = useState<UserAllergy[]>([]);
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [newAllergen, setNewAllergen] = useState("");
  const [newSeverity, setNewSeverity] = useState("moderate");

  useEffect(() => {
    if (activeUserId) {
      fetchUserAllergies();
    }
  }, [activeUserId]);

  const fetchUserAllergies = async () => {
    if (!activeUserId) return;
    
    const { data, error } = await supabase
      .from('user_allergies')
      .select('*')
      .eq('user_id', activeUserId);
    
    if (error) {
      console.error('Error fetching allergies:', error);
      return;
    }
    
    setUserAllergies(data || []);
  };

  const addAllergy = async () => {
    if (!activeUserId || !newAllergen.trim()) return;
    
    const { error } = await supabase
      .from('user_allergies')
      .insert({
        user_id: activeUserId,
        allergen: newAllergen.trim(),
        severity: newSeverity
      });
    
    if (error) {
      if (error.code === '23505') {
        toast.error(t('pollen.alreadyTracked'));
      } else {
        toast.error(t('pollen.addFailed'));
      }
      return;
    }
    
    toast.success(t('pollen.addSuccess'));
    setNewAllergen("");
    setNewSeverity("moderate");
    setIsAddingAllergy(false);
    fetchUserAllergies();
  };

  const removeAllergy = async (id: string) => {
    const { error } = await supabase
      .from('user_allergies')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error(t('pollen.removeFailed'));
      return;
    }
    
    toast.success(t('pollen.removeSuccess'));
    fetchUserAllergies();
  };

  if (!pollenData) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div>{t('pollen.noData')}</div>
        <div className="text-xs mt-1">{t('pollen.locationRequired')}</div>
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  
  const allPollens: SeasonalPollen[] = [
    {
      name: "Alder",
      value: pollenData.alder || 0,
      color: "hsl(25 95% 53%)",
      months: [0, 1, 2, 3],
      season: t('pollen.earlySpring')
    },
    {
      name: "Birch",
      value: pollenData.birch || 0,
      color: "hsl(142 71% 45%)",
      months: [2, 3, 4],
      season: t('pollen.spring')
    },
    {
      name: "Grass",
      value: pollenData.grass || 0,
      color: "hsl(120 60% 50%)",
      months: [4, 5, 6, 7, 8],
      season: t('pollen.lateSpring')
    },
    {
      name: "Mugwort",
      value: pollenData.mugwort || 0,
      color: "hsl(280 70% 55%)",
      months: [6, 7, 8],
      season: t('pollen.lateSummer')
    },
    {
      name: "Olive",
      value: pollenData.olive || 0,
      color: "hsl(47 96% 53%)",
      months: [3, 4, 5],
      season: t('pollen.springSummer')
    },
    {
      name: "Ragweed",
      value: pollenData.ragweed || 0,
      color: "hsl(15 80% 50%)",
      months: [7, 8, 9, 10],
      season: t('pollen.autumn')
    }
  ];

  const seasonalPollens = allPollens.filter(pollen => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    return pollen.months.includes(prevMonth) || 
           pollen.months.includes(currentMonth) || 
           pollen.months.includes(nextMonth);
  });

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

  const getIntensityBg = (value: number): string => {
    if (value === 0) return "bg-muted/30";
    if (value <= 2) return "bg-blue-500/20";
    if (value <= 5) return "bg-yellow-500/20";
    if (value <= 8) return "bg-orange-500/20";
    return "bg-red-500/20";
  };

  const getUserAllergyAlert = (pollenName: string, value: number): boolean => {
    if (!activeUserId) return false;
    const userAllergy = userAllergies.find(a => a.allergen.toLowerCase() === pollenName.toLowerCase());
    if (!userAllergy || value === 0) return false;
    
    if (userAllergy.severity === 'mild' && value > 5) return true;
    if (userAllergy.severity === 'moderate' && value > 2) return true;
    if (userAllergy.severity === 'severe' && value > 0) return true;
    
    return false;
  };

  const getOverallValue = () => {
    if (seasonalPollens.length === 0) return 0;
    const total = seasonalPollens.reduce((sum, p) => sum + p.value, 0);
    return Math.round(total / seasonalPollens.length);
  };

  const overallValue = getOverallValue();
  const overallLevel = getIntensityLabel(overallValue);

  return (
    <div className="space-y-4">
      {/* Overall level + track allergy button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${getIntensityBg(overallValue)} p-3 rounded-xl`}>
            <div className={`text-2xl font-bold ${getIntensityColor(overallValue)}`}>{overallValue}</div>
          </div>
          <div>
            <div className={`font-semibold ${getIntensityColor(overallValue)}`}>{overallLevel}</div>
            <div className="text-xs text-muted-foreground">
              {seasonalPollens.length} {t('pollen.active')}
            </div>
          </div>
        </div>
        {activeUserId && (
          <Dialog open={isAddingAllergy} onOpenChange={setIsAddingAllergy}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" />
                {t('pollen.trackAllergy')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pollen.addAllergy')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="allergen">{t('pollen.allergen')}</Label>
                  <Input
                    id="allergen"
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    placeholder={t('pollen.allergenPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="severity">{t('pollen.sensitivityLevel')}</Label>
                  <Select value={newSeverity} onValueChange={setNewSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">{t('pollen.mild')}</SelectItem>
                      <SelectItem value="moderate">{t('pollen.moderate')}</SelectItem>
                      <SelectItem value="severe">{t('pollen.severe')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addAllergy} className="w-full">
                  {t('pollen.addAllergyButton')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pollen grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {seasonalPollens.map((pollen) => {
          const hasAlert = activeUserId && getUserAllergyAlert(pollen.name, pollen.value);
          const level = getIntensityLabel(pollen.value);
          
          return (
            <div
              key={pollen.name}
              className={`p-2.5 rounded-xl bg-muted/30 border ${hasAlert ? 'border-destructive/50' : 'border-border/30'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {hasAlert && <AlertTriangle className="w-3 h-3 text-destructive" />}
                <div className="text-muted-foreground">{pollen.name}</div>
              </div>
              <div className={`font-semibold text-sm ${getIntensityColor(pollen.value)}`}>{level}</div>
              <div className="text-muted-foreground">{pollen.value} grains/m³</div>
            </div>
          );
        })}
      </div>

      {/* User Tracked Allergies */}
      {activeUserId && userAllergies.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{t('pollen.yourTracked')}</h4>
          <div className="flex flex-wrap gap-2">
            {userAllergies.map((allergy) => (
              <Badge key={allergy.id} variant="secondary" className="flex items-center gap-1">
                {allergy.allergen}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => removeAllergy(allergy.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
