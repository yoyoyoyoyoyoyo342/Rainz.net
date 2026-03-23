import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import * as amplitude from "@amplitude/unified";
import { useAuth } from "./use-auth";
import { useCookieConsent } from "./use-cookie-consent";

/**
 * Enhanced Amplitude tracking:
 * - Funnel steps (landed → searched → viewed → predicted → shared)
 * - Feature adoption via IntersectionObserver
 * - Scroll depth tracking (25/50/75/100%)
 * - Engagement scoring (user properties)
 * - Churn signals (early dialog dismiss, quick page leave)
 */
export function useAmplitudeFunnels() {
  const location = useLocation();
  const { user } = useAuth();
  const { preferences } = useCookieConsent();
  const pageEnteredAt = useRef(Date.now());
  const scrollMilestones = useRef(new Set<number>());
  const observedCards = useRef(new Set<string>());

  const canTrack = preferences?.analytics !== false;

  const safeTrack = useCallback(
    (event: string, props?: Record<string, unknown>) => {
      if (!canTrack) return;
      try {
        amplitude.track(event, { ...props, user_id: user?.id || null });
      } catch {}
    },
    [canTrack, user?.id]
  );

  // Track page enter time for churn detection
  useEffect(() => {
    pageEnteredAt.current = Date.now();
    scrollMilestones.current.clear();
  }, [location.pathname]);

  // Detect quick page leave (< 3 seconds = possible churn signal)
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - pageEnteredAt.current;
      if (timeSpent < 3000 && location.pathname === "/") {
        safeTrack("quick_page_leave", {
          page_path: location.pathname,
          time_spent_ms: timeSpent,
        });
      }
    };
  }, [location.pathname, safeTrack]);

  // Scroll depth tracking
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = Math.round((scrollTop / docHeight) * 100);
      const milestones = [25, 50, 75, 100];

      for (const m of milestones) {
        if (pct >= m && !scrollMilestones.current.has(m)) {
          scrollMilestones.current.add(m);
          safeTrack("scroll_depth_reached", {
            page_path: location.pathname,
            depth_percent: m,
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname, safeTrack]);

  // Feature adoption via IntersectionObserver
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cardId = (entry.target as HTMLElement).dataset.amplitudeCard;
            if (cardId && !observedCards.current.has(cardId)) {
              observedCards.current.add(cardId);
              safeTrack("feature_visible", {
                card_id: cardId,
                page_path: location.pathname,
              });
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    // Observe all elements with data-amplitude-card
    const cards = document.querySelectorAll("[data-amplitude-card]");
    cards.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [location.pathname, safeTrack]);

  // Update user properties for engagement scoring on each session
  useEffect(() => {
    if (!user || !canTrack) return;

    const updateEngagement = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        const [predictions, streaks, profile] = await Promise.all([
          supabase
            .from("weather_predictions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("user_streaks")
            .select("current_streak, total_visits")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("profiles")
            .select("created_at, total_points, shop_points")
            .eq("user_id", user.id)
            .single(),
        ]);

        const predictionCount = predictions.count || 0;
        const streak = streaks.data?.current_streak || 0;
        const totalVisits = streaks.data?.total_visits || 0;
        const daysSinceSignup = profile.data?.created_at
          ? Math.floor(
              (Date.now() - new Date(profile.data.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        // Engagement level
        let engagementLevel = "casual";
        if (predictionCount >= 10 && streak >= 3) engagementLevel = "active";
        if (predictionCount >= 50 && streak >= 7) engagementLevel = "power";

        const identify = new amplitude.Identify();
        identify.set("engagement_level", engagementLevel);
        identify.set("prediction_count", predictionCount);
        identify.set("current_streak", streak);
        identify.set("total_visits", totalVisits);
        identify.set("days_since_signup", daysSinceSignup);
        identify.set("total_points", profile.data?.total_points || 0);
        amplitude.identify(identify);
      } catch {}
    };

    updateEngagement();
  }, [user, canTrack]);

  // Dialog dismiss tracking
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const openDialog = document.querySelector("[data-state='open'][role='dialog']");
        if (openDialog) {
          safeTrack("dialog_dismissed_early", {
            page_path: location.pathname,
            dismiss_method: "escape_key",
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [location.pathname, safeTrack]);

  return { safeTrack };
}
