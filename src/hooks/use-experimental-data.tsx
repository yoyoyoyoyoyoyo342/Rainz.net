import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "rainz_use_experimental_data";

export function useExperimentalData() {
  const [useExperimental, setUseExperimentalState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false"; // Default to true for everyone
  });

  // Dispatch event so other components can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("experimental-data-change", { detail: useExperimental }));
  }, [useExperimental]);

  const setUseExperimental = useCallback((value: boolean) => {
    setUseExperimentalState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setUseExperimentalState(e.newValue !== "false");
      }
    };
    
    const handleCustomEvent = (e: CustomEvent) => {
      setUseExperimentalState(e.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("experimental-data-change", handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("experimental-data-change", handleCustomEvent as EventListener);
    };
  }, []);

  return { useExperimental, setUseExperimental, isSubscribed: true };
}
