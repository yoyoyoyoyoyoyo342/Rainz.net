import { supabase } from '@/integrations/supabase/client';

// Generate a session ID that persists for the browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export type TrackEventType = 
  | 'pageview'
  | 'location_search'
  | 'location_detect'
  | 'weather_view'
  | 'prediction_made'
  | 'prediction_verified'
  | 'game_played'
  | 'game_completed'
  | 'subscription_view'
  | 'subscription_started'
  | 'settings_changed'
  | 'share_weather'
  | 'notification_enabled'
  | 'pwa_installed'
  | 'ai_chat_started'
  | 'ai_chat_message'
  | 'saved_location_added'
  | 'saved_location_removed'
  | 'language_changed'
  | 'theme_changed'
  | 'unit_changed'
  | 'card_reordered'
  | 'battle_created'
  | 'battle_joined'
  | 'blog_post_view'
  | 'affiliate_click';

interface TrackEventOptions {
  metadata?: Record<string, string | number | boolean | null>;
}

export async function trackEvent(
  eventType: TrackEventType,
  pagePath: string = window.location.pathname,
  options: TrackEventOptions = {}
) {
  try {
    // Check if analytics cookies are accepted
    const consent = localStorage.getItem('cookie-consent');
    if (consent) {
      const preferences = JSON.parse(consent);
      if (!preferences.analytics) {
        return;
      }
    }

    const sessionId = getSessionId();
    
    // Get auth token for server-side user identification
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    await supabase.functions.invoke('track-analytics', {
      body: {
        event_type: eventType,
        page_path: pagePath,
        session_id: sessionId,
        metadata: options.metadata || {},
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

// Convenience functions for common events
export const trackLocationSearch = (locationName: string, latitude: number, longitude: number, searchType: string) => {
  trackEvent('location_search', '/search', {
    metadata: {
      location_name: locationName,
      latitude,
      longitude,
      search_type: searchType,
    },
  });
};

export const trackWeatherView = (locationName: string, latitude: number, longitude: number) => {
  trackEvent('weather_view', '/', {
    metadata: {
      location_name: locationName,
      latitude,
      longitude,
    },
  });
};

export const trackPredictionMade = (locationName: string) => {
  trackEvent('prediction_made', '/predictions', {
    metadata: { location_name: locationName },
  });
};

export const trackGamePlayed = (gameName: string) => {
  trackEvent('game_played', '/games', {
    metadata: { game_name: gameName },
  });
};

export const trackGameCompleted = (gameName: string, score: number) => {
  trackEvent('game_completed', '/games', {
    metadata: { game_name: gameName, score },
  });
};

export const trackAIChatMessage = () => {
  trackEvent('ai_chat_message', '/ai-chat');
};

export const trackSubscriptionView = () => {
  trackEvent('subscription_view', '/subscription');
};

export const trackBlogPostView = (slug: string, title: string) => {
  trackEvent('blog_post_view', `/blog/${slug}`, {
    metadata: { slug, title },
  });
};

export const trackAffiliateClick = (businessName: string) => {
  trackEvent('affiliate_click', '/affiliate', {
    metadata: { business_name: businessName },
  });
};

export const trackPWAInstalled = () => {
  trackEvent('pwa_installed', '/');
};

export const trackLocationDetect = () => {
  trackEvent('location_detect', '/');
};
