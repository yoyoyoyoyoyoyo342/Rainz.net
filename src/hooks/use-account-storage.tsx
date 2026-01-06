import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface AccountStorageData {
  userLocation: { lat: number; lon: number; name: string } | null;
  dismissedBroadcasts: string[];
  readBroadcasts: string[];
  morningReviewDismissed: string | null;
  gameHighScores: {
    sunshineCollector: number;
    snowSkiing: number;
    cloudJump: number;
    windSurfer: number;
    rainDodge: number;
    lightningDodge: number;
  };
}

const DEFAULT_DATA: AccountStorageData = {
  userLocation: null,
  dismissedBroadcasts: [],
  readBroadcasts: [],
  morningReviewDismissed: null,
  gameHighScores: {
    sunshineCollector: 0,
    snowSkiing: 0,
    cloudJump: 0,
    windSurfer: 0,
    rainDodge: 0,
    lightningDodge: 0,
  },
};

// Storage key in user_preferences premium_settings
const STORAGE_KEY = 'account_storage';

export function useAccountStorage() {
  const { user } = useAuth();
  const [data, setData] = useState<AccountStorageData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  // Load data from account or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        // User is logged in - load from database
        try {
          const { data: prefs, error } = await supabase
            .from("user_preferences")
            .select("premium_settings")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!error && prefs?.premium_settings) {
            const settings = prefs.premium_settings as any;
            const stored = settings[STORAGE_KEY] || {};
            
            // Merge with defaults
            setData({
              ...DEFAULT_DATA,
              ...stored,
              gameHighScores: {
                ...DEFAULT_DATA.gameHighScores,
                ...(stored.gameHighScores || {}),
              },
            });
          }

          // Migrate localStorage data to account if exists
          await migrateLocalStorageToAccount(user.id);
        } catch (err) {
          console.error('Error loading account storage:', err);
        }
      } else {
        // No user - load from localStorage
        loadFromLocalStorage();
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Migrate localStorage to database for new account logins
  const migrateLocalStorageToAccount = async (userId: string) => {
    try {
      const localData: Partial<AccountStorageData> = {};
      let hasMigrationData = false;

      // Check for userLocation
      const storedLocation = localStorage.getItem("userLocation");
      if (storedLocation) {
        try {
          localData.userLocation = JSON.parse(storedLocation);
          hasMigrationData = true;
        } catch {}
      }

      // Check for game high scores
      const gameScores: any = {};
      const scoreKeys = [
        { key: "sunshineCollectorHighScore", field: "sunshineCollector" },
        { key: "snowSkiingHighScore", field: "snowSkiing" },
        { key: "cloudJumpHighScore", field: "cloudJump" },
        { key: "windSurferHighScore", field: "windSurfer" },
        { key: "rainDodgeHighScore", field: "rainDodge" },
        { key: "lightningDodgeHighScore", field: "lightningDodge" },
      ];

      for (const { key, field } of scoreKeys) {
        const score = localStorage.getItem(key);
        if (score) {
          gameScores[field] = parseInt(score, 10) || 0;
          hasMigrationData = true;
        }
      }

      if (Object.keys(gameScores).length > 0) {
        localData.gameHighScores = { ...DEFAULT_DATA.gameHighScores, ...gameScores };
      }

      // Check morning review dismissed
      const morningDismissed = localStorage.getItem("morning-review-dismissed");
      if (morningDismissed) {
        localData.morningReviewDismissed = morningDismissed;
        hasMigrationData = true;
      }

      // Check dismissed broadcasts
      const dismissedBroadcasts = localStorage.getItem("rainz-dismissed-messages");
      if (dismissedBroadcasts) {
        try {
          localData.dismissedBroadcasts = JSON.parse(dismissedBroadcasts);
          hasMigrationData = true;
        } catch {}
      }

      // If we have data to migrate, save to account
      if (hasMigrationData) {
        const mergedData = {
          ...DEFAULT_DATA,
          ...data,
          ...localData,
          gameHighScores: {
            ...DEFAULT_DATA.gameHighScores,
            ...data.gameHighScores,
            ...(localData.gameHighScores || {}),
          },
        };

        await saveToAccount(userId, mergedData);
        setData(mergedData);

        // Clear localStorage after successful migration
        localStorage.removeItem("userLocation");
        localStorage.removeItem("morning-review-dismissed");
        localStorage.removeItem("rainz-dismissed-messages");
        localStorage.removeItem("rainz-read-messages");
        for (const { key } of scoreKeys) {
          localStorage.removeItem(key);
        }

        console.log('Migrated localStorage data to account');
      }
    } catch (err) {
      console.error('Error migrating localStorage:', err);
    }
  };

  const loadFromLocalStorage = () => {
    const localData: AccountStorageData = { ...DEFAULT_DATA };

    // Load userLocation
    const storedLocation = localStorage.getItem("userLocation");
    if (storedLocation) {
      try {
        localData.userLocation = JSON.parse(storedLocation);
      } catch {}
    }

    // Load game high scores
    const scoreKeys = [
      { key: "sunshineCollectorHighScore", field: "sunshineCollector" },
      { key: "snowSkiingHighScore", field: "snowSkiing" },
      { key: "cloudJumpHighScore", field: "cloudJump" },
      { key: "windSurferHighScore", field: "windSurfer" },
      { key: "rainDodgeHighScore", field: "rainDodge" },
      { key: "lightningDodgeHighScore", field: "lightningDodge" },
    ];

    for (const { key, field } of scoreKeys) {
      const score = localStorage.getItem(key);
      if (score) {
        (localData.gameHighScores as any)[field] = parseInt(score, 10) || 0;
      }
    }

    // Load morning review dismissed
    localData.morningReviewDismissed = localStorage.getItem("morning-review-dismissed");

    // Load dismissed broadcasts
    const dismissedBroadcasts = localStorage.getItem("rainz-dismissed-messages");
    if (dismissedBroadcasts) {
      try {
        localData.dismissedBroadcasts = JSON.parse(dismissedBroadcasts);
      } catch {}
    }

    setData(localData);
  };

  const saveToAccount = async (userId: string, newData: AccountStorageData) => {
    try {
      // Get current premium_settings
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("premium_settings")
        .eq("user_id", userId)
        .maybeSingle();

      const currentSettings = (prefs?.premium_settings as any) || {};
      
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          premium_settings: {
            ...currentSettings,
            [STORAGE_KEY]: newData,
          },
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Error saving to account:', err);
    }
  };

  // Update user location
  const setUserLocation = useCallback(async (location: { lat: number; lon: number; name: string } | null) => {
    const newData = { ...data, userLocation: location };
    setData(newData);

    if (user) {
      await saveToAccount(user.id, newData);
    } else {
      if (location) {
        localStorage.setItem("userLocation", JSON.stringify(location));
      } else {
        localStorage.removeItem("userLocation");
      }
    }
  }, [user, data]);

  // Update game high score
  const setGameHighScore = useCallback(async (game: keyof AccountStorageData['gameHighScores'], score: number) => {
    const currentScore = data.gameHighScores[game] || 0;
    if (score <= currentScore) return; // Only update if higher

    const newData = {
      ...data,
      gameHighScores: {
        ...data.gameHighScores,
        [game]: score,
      },
    };
    setData(newData);

    if (user) {
      await saveToAccount(user.id, newData);
    } else {
      const keyMap: Record<string, string> = {
        sunshineCollector: "sunshineCollectorHighScore",
        snowSkiing: "snowSkiingHighScore",
        cloudJump: "cloudJumpHighScore",
        windSurfer: "windSurferHighScore",
        rainDodge: "rainDodgeHighScore",
        lightningDodge: "lightningDodgeHighScore",
      };
      localStorage.setItem(keyMap[game], score.toString());
    }
  }, [user, data]);

  // Dismiss morning review
  const dismissMorningReview = useCallback(async () => {
    const today = new Date().toDateString();
    const newData = { ...data, morningReviewDismissed: today };
    setData(newData);

    if (user) {
      await saveToAccount(user.id, newData);
    } else {
      localStorage.setItem("morning-review-dismissed", today);
    }
  }, [user, data]);

  // Dismiss broadcast
  const dismissBroadcast = useCallback(async (messageId: string) => {
    const newDismissed = [...new Set([...data.dismissedBroadcasts, messageId])];
    const newData = { ...data, dismissedBroadcasts: newDismissed };
    setData(newData);

    if (user) {
      await saveToAccount(user.id, newData);
    } else {
      localStorage.setItem("rainz-dismissed-messages", JSON.stringify(newDismissed));
    }
  }, [user, data]);

  return {
    data,
    loading,
    setUserLocation,
    setGameHighScore,
    dismissMorningReview,
    dismissBroadcast,
    isAuthenticated: !!user,
  };
}
