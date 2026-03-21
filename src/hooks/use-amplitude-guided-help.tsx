import { useState, useEffect, useCallback } from 'react';
import * as amplitude from '@amplitude/unified';
import { useCookieConsent } from './use-cookie-consent';

export type GuidedHelpTip = {
  id: string;
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
};

const TIPS: Record<string, GuidedHelpTip> = {
  idle_on_home: {
    id: 'idle_on_home',
    title: 'Need help? 🌤️',
    message: 'Tap the search bar above to find weather for any location, or allow location access for automatic local forecasts.',
    actionLabel: 'Got it',
  },
  no_location_set: {
    id: 'no_location_set',
    title: 'Set your home location 📍',
    message: 'Save a location to get personalised weather updates every time you open Rainz.',
    actionLabel: 'Got it',
  },
  explore_features: {
    id: 'explore_features',
    title: 'There\'s more to explore! 🎯',
    message: 'Try making a weather prediction, check the pollen forecast, or chat with PAI — your AI weather companion.',
    actionLabel: 'Got it',
  },
  first_visit_guide: {
    id: 'first_visit_guide',
    title: 'Welcome to Rainz! 🌧️',
    message: 'Scroll down to see detailed forecasts, air quality, pollen data and more. Tap Explore to discover all features.',
    actionLabel: 'Let\'s go',
  },
};

const DISMISSED_KEY = 'rainz-guided-help-dismissed';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function useAmplitudeGuidedHelp(context: {
  hasLocation: boolean;
  hasSavedLocations: boolean;
  isNewUser: boolean;
  pageLoadedAt: number;
}) {
  const [activeTip, setActiveTip] = useState<GuidedHelpTip | null>(null);
  const { preferences } = useCookieConsent();

  const dismiss = useCallback((tipId: string) => {
    const dismissed = getDismissed();
    dismissed.add(tipId);
    persistDismissed(dismissed);
    setActiveTip(null);

    // Track dismissal
    if (preferences?.analytics) {
      amplitude.track('guided_help_dismissed', { tip_id: tipId });
    }
  }, [preferences?.analytics]);

  useEffect(() => {
    const dismissed = getDismissed();

    // Determine which tip to show based on context
    const pickTip = (): GuidedHelpTip | null => {
      if (context.isNewUser && !dismissed.has('first_visit_guide')) {
        return TIPS.first_visit_guide;
      }
      if (!context.hasLocation && !dismissed.has('no_location_set')) {
        return TIPS.no_location_set;
      }
      return null;
    };

    // Show contextual tip after a short delay
    const timer = setTimeout(() => {
      const tip = pickTip();
      if (tip) {
        setActiveTip(tip);
        if (preferences?.analytics) {
          amplitude.track('guided_help_shown', { tip_id: tip.id });
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [context.hasLocation, context.isNewUser, preferences?.analytics]);

  // Idle detection — if user sits on page for 20s with no location, nudge them
  useEffect(() => {
    const dismissed = getDismissed();
    if (dismissed.has('idle_on_home') || context.hasLocation) return;

    const idleTimer = setTimeout(() => {
      if (!activeTip) {
        const tip = TIPS.idle_on_home;
        setActiveTip(tip);
        if (preferences?.analytics) {
          amplitude.track('guided_help_shown', { tip_id: tip.id, trigger: 'idle' });
        }
      }
    }, 20000);

    return () => clearTimeout(idleTimer);
  }, [context.hasLocation, activeTip, preferences?.analytics]);

  return { activeTip, dismiss };
}
