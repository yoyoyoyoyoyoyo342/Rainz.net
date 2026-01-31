import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export interface PremiumSettings {
  animatedBackgrounds: boolean;
  compactMode: boolean;
  showFeelsLike: boolean;
  showWindChill: boolean;
  showHumidity: boolean;
  showUV: boolean;
  showPrecipChance: boolean;
  showDewPoint: boolean;
  showPressure: boolean;
  showVisibility: boolean;
  showSunTimes: boolean;
  showMoonPhase: boolean;
}

const DEFAULT_PREMIUM_SETTINGS: PremiumSettings = {
  animatedBackgrounds: true,
  compactMode: false,
  showFeelsLike: true,
  showWindChill: true,
  showHumidity: true,
  showUV: true,
  showPrecipChance: true,
  showDewPoint: false,
  showPressure: false,
  showVisibility: true,
  showSunTimes: true,
  showMoonPhase: true,
};

type PremiumSettingsContextValue = {
  settings: PremiumSettings;
  loading: boolean;
  isSubscribed: boolean;
  updateSetting: <K extends keyof PremiumSettings>(key: K, value: PremiumSettings[K]) => Promise<void>;
  updateSettings: (newSettings: Partial<PremiumSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
};

const PremiumSettingsContext = createContext<PremiumSettingsContextValue | undefined>(undefined);

function usePremiumSettingsState(): PremiumSettingsContextValue {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PremiumSettings>(DEFAULT_PREMIUM_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Fetch settings from cloud
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_PREMIUM_SETTINGS);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("premium_settings")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching premium settings:", error);
          return;
        }

        if (data?.premium_settings) {
          setSettings({
            ...DEFAULT_PREMIUM_SETTINGS,
            ...(data.premium_settings as Partial<PremiumSettings>),
          });
        }
      } catch (error) {
        console.error("Error in fetchSettings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Update a single setting - now available to all users
  const updateSetting = useCallback(
    async <K extends keyof PremiumSettings>(key: K, value: PremiumSettings[K]) => {
      if (!user) return;

      const prevSettings = settings;
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      try {
        const { error } = await supabase
          .from("user_preferences")
          .update({
            premium_settings: JSON.parse(JSON.stringify(newSettings)),
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error updating setting:", error);
          toast({
            title: "Failed to save setting",
            description: error.message,
            variant: "destructive",
          });
          setSettings(prevSettings);
        }
      } catch (error) {
        console.error("Error in updateSetting:", error);
        setSettings(prevSettings);
      }
    },
    [user, settings, toast]
  );

  // Update multiple settings at once
  const updateSettings = useCallback(
    async (newSettings: Partial<PremiumSettings>) => {
      if (!user) return;

      const prevSettings = settings;
      const mergedSettings = { ...settings, ...newSettings };
      setSettings(mergedSettings);

      try {
        const { error } = await supabase
          .from("user_preferences")
          .update({
            premium_settings: JSON.parse(JSON.stringify(mergedSettings)),
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error updating settings:", error);
          toast({
            title: "Failed to save settings",
            description: error.message,
            variant: "destructive",
          });
          setSettings(prevSettings);
        }
      } catch (error) {
        console.error("Error in updateSettings:", error);
        setSettings(prevSettings);
      }
    },
    [user, settings, toast]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    if (!user) return;

    setSettings(DEFAULT_PREMIUM_SETTINGS);

    try {
      const { error } = await supabase
        .from("user_preferences")
        .update({
          premium_settings: JSON.parse(JSON.stringify(DEFAULT_PREMIUM_SETTINGS)),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error resetting settings:", error);
        toast({
          title: "Failed to reset settings",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Settings reset",
          description: "Display settings have been reset to defaults",
        });
      }
    } catch (error) {
      console.error("Error in resetToDefaults:", error);
    }
  }, [user, toast]);

  return {
    settings,
    loading,
    isSubscribed: true, // All features now free
    updateSetting,
    updateSettings,
    resetToDefaults,
  };
}

export function PremiumSettingsProvider({ children }: { children: ReactNode }) {
  const value = usePremiumSettingsState();
  return <PremiumSettingsContext.Provider value={value}>{children}</PremiumSettingsContext.Provider>;
}

export function usePremiumSettings() {
  const context = useContext(PremiumSettingsContext);
  return context ?? usePremiumSettingsState();
}
