import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "rejn.location_permission";

export type LocationPermission = "granted" | "denied" | "prompt";

/**
 * Persistent location-permission memory. Fixes the PWA re-prompt bug:
 * once a user picks granted/denied, we remember it (localStorage + profile)
 * and never trigger the native prompt again.
 */
export function useLocationPermission() {
  const [state, setState] = useState<LocationPermission>(() => {
    if (typeof window === "undefined") return "prompt";
    const v = localStorage.getItem(LS_KEY);
    if (v === "granted" || v === "denied") return v;
    return "prompt";
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("location_permission")
          .eq("user_id", user.id)
          .maybeSingle();
        const remote = (data as any)?.location_permission;
        if (remote === "granted" || remote === "denied") {
          localStorage.setItem(LS_KEY, remote);
          if (!cancelled) setState(remote);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (value: LocationPermission) => {
    setState(value);
    if (value === "granted" || value === "denied") {
      localStorage.setItem(LS_KEY, value);
    } else {
      localStorage.removeItem(LS_KEY);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ location_permission: value } as any)
          .eq("user_id", user.id);
      }
    } catch { /* ignore */ }
  }, []);

  return { state, persist };
}
