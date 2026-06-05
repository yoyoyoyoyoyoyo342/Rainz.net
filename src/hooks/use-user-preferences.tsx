import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export interface CardVisibility {
  pollen: boolean;
  hourly: boolean;
  tenDay: boolean;
  detailedMetrics: boolean;
  weatherTrends: boolean;
  aqi: boolean;
  alerts: boolean;
  barometer: boolean;
  rainMap: boolean;
}

export type CardType = keyof CardVisibility;

const DEFAULT_VISIBILITY: CardVisibility = {
  pollen: true,
  hourly: true,
  tenDay: true,
  detailedMetrics: true,
  weatherTrends: true,
  aqi: true,
  alerts: true,
  barometer: true,
  rainMap: true,
};

const DEFAULT_ORDER: CardType[] = ["weatherTrends", "barometer", "pollen", "hourly", "rainMap", "tenDay", "detailedMetrics", "aqi", "alerts"];

// Thin wrapper over the new Aiven-backed `user-preferences` edge function.
async function fetchPrefs() {
  const { data, error } = await supabase.functions.invoke("user-preferences", { method: "GET" });
  if (error) throw error;
  return (data as any)?.data ?? null;
}

async function savePrefs(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("user-preferences", {
    method: "PUT",
    body: payload,
  });
  if (error) throw error;
  return (data as any)?.data ?? null;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visibleCards, setVisibleCards] = useState<CardVisibility>(DEFAULT_VISIBILITY);
  const [cardOrder, setCardOrder] = useState<CardType[]>(DEFAULT_ORDER);
  const [is24Hour, setIs24Hour] = useState(true);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [savedAddress, setSavedAddress] = useState<string>("");
  const [savedCoordinates, setSavedCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setVisibleCards(DEFAULT_VISIBILITY);
      setCardOrder(DEFAULT_ORDER);
      setIs24Hour(true);
      setIsHighContrast(false);
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const data = await fetchPrefs();

        if (data) {
          let visible = data.visible_cards as any;
          let order = data.card_order as any;

          // Migration: old "routines" → "weatherTrends"
          if (visible?.routines !== undefined && visible.weatherTrends === undefined) {
            visible = { ...visible, weatherTrends: true };
            delete visible.routines;
          }
          if (Array.isArray(order) && order.includes("routines") && !order.includes("weatherTrends")) {
            order = order.map((c: string) => (c === "routines" ? "weatherTrends" : c));
          }

          // Ensure new keys exist
          for (const k of ["weatherTrends", "aqi", "alerts", "barometer", "rainMap"] as const) {
            if (visible?.[k] === undefined) visible[k] = true;
            if (Array.isArray(order) && !order.includes(k)) order.push(k);
          }

          // Drop deprecated
          delete visible?.weatherSources;
          delete visible?.forecastConfidence;
          if (Array.isArray(order)) {
            order = order.filter((c: string) => c !== "forecastConfidence" && c !== "weatherSources");
          }

          setVisibleCards(visible);
          setCardOrder(order);
          setIs24Hour(data.is_24_hour ?? true);
          setIsHighContrast(data.is_high_contrast ?? false);
          setSavedAddress(data.saved_address || "");
          if (data.saved_latitude && data.saved_longitude) {
            setSavedCoordinates({ lat: data.saved_latitude, lon: data.saved_longitude });
          }

          // Persist any in-flight migrations
          await savePrefs({ visible_cards: visible, card_order: order }).catch(() => {});
        } else {
          await savePrefs({
            visible_cards: DEFAULT_VISIBILITY,
            card_order: DEFAULT_ORDER,
            is_24_hour: true,
            is_high_contrast: false,
          }).catch((e) => console.error("Error creating preferences:", e));
        }
      } catch (error) {
        console.error("Error in fetchPreferences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const persist = async (patch: Record<string, unknown>, onError: () => void, label: string) => {
    try {
      await savePrefs(patch);
    } catch (e: any) {
      console.error(`Error updating ${label}:`, e);
      toast({ title: `Failed to save ${label}`, description: e?.message ?? "", variant: "destructive" });
      onError();
    }
  };

  const updateVisibility = async (cardType: CardType, visible: boolean) => {
    if (!user) return;
    const prev = visibleCards;
    const next = { ...visibleCards, [cardType]: visible };
    setVisibleCards(next);
    await persist(
      { visible_cards: next, card_order: cardOrder, is_24_hour: is24Hour, is_high_contrast: isHighContrast },
      () => setVisibleCards(prev),
      "preferences",
    );
  };

  const updateOrder = async (newOrder: CardType[]) => {
    if (!user) return;
    const prev = cardOrder;
    setCardOrder(newOrder);
    await persist(
      { visible_cards: visibleCards, card_order: newOrder, is_24_hour: is24Hour, is_high_contrast: isHighContrast },
      () => setCardOrder(prev),
      "order",
    );
  };

  const updateTimeFormat = async (use24Hour: boolean) => {
    if (!user) return;
    setIs24Hour(use24Hour);
    await persist(
      { visible_cards: visibleCards, card_order: cardOrder, is_24_hour: use24Hour, is_high_contrast: isHighContrast },
      () => setIs24Hour(!use24Hour),
      "time format",
    );
  };

  const updateHighContrast = async (useHighContrast: boolean) => {
    if (!user) return;
    setIsHighContrast(useHighContrast);
    await persist(
      { visible_cards: visibleCards, card_order: cardOrder, is_24_hour: is24Hour, is_high_contrast: useHighContrast },
      () => setIsHighContrast(!useHighContrast),
      "high contrast mode",
    );
  };

  const resetToDefaults = async () => {
    if (!user) return;
    setVisibleCards(DEFAULT_VISIBILITY);
    setCardOrder(DEFAULT_ORDER);
    setIs24Hour(true);
    setIsHighContrast(false);
    try {
      await savePrefs({
        visible_cards: DEFAULT_VISIBILITY,
        card_order: DEFAULT_ORDER,
        is_24_hour: true,
        is_high_contrast: false,
      });
      toast({ title: "Preferences reset", description: "All cards are now visible in default order" });
    } catch (e: any) {
      console.error("Error resetting preferences:", e);
      toast({ title: "Failed to reset preferences", description: e?.message ?? "", variant: "destructive" });
    }
  };

  const updateSavedAddress = async (address: string, lat: number, lon: number) => {
    if (!user) return;
    setSavedAddress(address);
    setSavedCoordinates({ lat, lon });
    await persist(
      {
        visible_cards: visibleCards,
        card_order: cardOrder,
        is_24_hour: is24Hour,
        is_high_contrast: isHighContrast,
        saved_address: address,
        saved_latitude: lat,
        saved_longitude: lon,
      },
      () => {},
      "address",
    );
  };

  return {
    visibleCards,
    cardOrder,
    is24Hour,
    isHighContrast,
    savedAddress,
    savedCoordinates,
    loading,
    updateVisibility,
    updateOrder,
    updateTimeFormat,
    updateHighContrast,
    updateSavedAddress,
    resetToDefaults,
    isAuthenticated: !!user,
  };
}
