import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { weatherApi } from '@/lib/weather-api';
import { isIOS, isPWAInstalled, needsPWAInstall, canRequestNotifications } from '@/lib/pwa-utils';
import { 
  isPushSupported, 
  subscribeToPush, 
  showLocalNotification,
  requestNotificationPermission as requestNativePermission 
} from '@/lib/notification-utils';

interface NotificationData {
  temperature: number;
  condition: string;
  highTemp: number;
  lowTemp: number;
  pollenAlerts: string[];
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    setPushSupported(isPushSupported());

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          console.log('Service Worker registered:', reg);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    // Check if we can request notifications
    if (!canRequestNotifications()) {
      if (needsPWAInstall()) {
        // Don't show error - let the settings dialog handle showing the install guide
        console.log('iOS user needs to install PWA first');
        return false;
      }
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support push notifications.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll receive daily weather and pollen updates.",
        });
        
        // Schedule daily notifications
        await scheduleDailyNotifications();
        return true;
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const scheduleDailyNotifications = async () => {
    console.log('Scheduling daily notifications...');
    
    // Clear any existing intervals first
    if ((window as any).weatherNotificationInterval) {
      clearInterval((window as any).weatherNotificationInterval);
    }
    if ((window as any).weatherNotificationTimeout) {
      clearTimeout((window as any).weatherNotificationTimeout);
    }

    // Get user's preferred notification time
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, using default time');
    }

    let notificationHour = 8;
    let notificationMinute = 0;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_time, notification_enabled')
        .eq('user_id', user.id)
        .single();

      if (profile && !profile.notification_enabled) {
        console.log('Notifications disabled by user');
        return;
      }

      if (profile?.notification_time) {
        const [hours, minutes] = profile.notification_time.split(':').map(Number);
        notificationHour = hours;
        notificationMinute = minutes;
        console.log(`Using user's preferred time: ${notificationHour}:${notificationMinute}`);
      }
    }

    // Schedule notification for user's preferred time daily
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(notificationHour, notificationMinute, 0, 0);

    // If it's already past the scheduled time today, schedule for tomorrow
    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    console.log(`Next notification in ${Math.round(timeUntilNotification / (1000 * 60 * 60))} hours`);

    // For testing - also schedule a notification in 1 minute
    const testTimeout = setTimeout(() => {
      console.log('Sending test notification...');
      sendDailyNotification();
    }, 60 * 1000); // 1 minute from now
    
    (window as any).weatherNotificationTimeout = setTimeout(() => {
      console.log('Sending daily notification...');
      sendDailyNotification();
      // Set up recurring daily notifications
      (window as any).weatherNotificationInterval = setInterval(() => {
        console.log('Sending recurring daily notification...');
        sendDailyNotification();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNotification);

    // Store test timeout for cleanup
    (window as any).weatherTestTimeout = testTimeout;
  };

  const sendDailyNotification = async () => {
    if (permission !== 'granted') return;

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not logged in, skipping AI notification');
        return;
      }

      // Get user's primary location
      const { data: locations } = await supabase
        .from('saved_locations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .limit(1);

      if (!locations || locations.length === 0) {
        console.log('No primary location found, sending generic notification');
        await sendGenericNotification();
        return;
      }

      const location = locations[0];
      
      // Fetch current weather data
      const weatherData = await weatherApi.getWeatherData(location.latitude, location.longitude, location.name);
      
      // Get user preferences for temperature units
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const isImperial = true; // Default to imperial, can be from preferences

      // Call AI insights function for morning review
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-weather-insights', {
        body: {
          type: 'morning_review',
          weatherData,
          location: location.name,
          isImperial,
          language: preferences?.language || 'en'
        }
      });

      if (aiError || !aiResponse) {
        console.error('AI insights error:', aiError);
        await sendGenericNotification();
        return;
      }

      // Format notification with AI-generated content
      const summary = aiResponse.summary || 'Check your weather app for today\'s forecast';
      const currentTemp = weatherData.aggregated?.currentWeather?.temperature || weatherData.mostAccurate?.currentWeather?.temperature || 70;
      const temp = isImperial ? 
        `${Math.round(currentTemp)}°F` : 
        `${Math.round((currentTemp - 32) * 5/9)}°C`;
      
      const notificationBody = `${temp} - ${summary}`;

      if (registration && 'showNotification' in registration) {
        await registration.showNotification('Good Morning! ☀️', {
          body: notificationBody,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'daily-weather-ai',
          requireInteraction: false,
          data: {
            url: '/',
            location: location.name
          }
        });
      } else {
        new Notification('Good Morning! ☀️', {
          body: notificationBody,
          icon: '/logo.png'
        });
      }
      
      console.log('AI-powered morning notification sent successfully');
    } catch (error) {
      console.error('Error sending daily notification:', error);
      await sendGenericNotification();
    }
  };

  const sendGenericNotification = async () => {
    const notificationBody = `Good morning! Check your weather app for today's forecast and pollen alerts.`;

    if (registration && 'showNotification' in registration) {
      await registration.showNotification('Daily Weather & Pollen Update', {
        body: notificationBody,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'daily-weather',
        requireInteraction: false
      });
    } else {
      new Notification('Daily Weather & Pollen Update', {
        body: notificationBody,
        icon: '/logo.png'
      });
    }
  };

  const sendTestNotification = async (data: NotificationData) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const pollenText = data.pollenAlerts.length > 0 
      ? ` High pollen: ${data.pollenAlerts.join(', ')}`
      : '';

    const notificationBody = `${data.condition}, ${data.temperature}°F (H: ${data.highTemp}° L: ${data.lowTemp}°)${pollenText}`;

    try {
      if (registration && 'showNotification' in registration) {
        await registration.showNotification('Test Weather & Pollen Update', {
          body: notificationBody,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'weather-test',
          requireInteraction: false
        });
      } else {
        new Notification('Test Weather & Pollen Update', {
          body: notificationBody,
          icon: '/logo.png'
        });
      }

      toast({
        title: "Test notification sent",
        description: "Check your notifications to see the weather update.",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Notification failed",
        description: "There was an error sending the test notification.",
        variant: "destructive"
      });
    }
  };

  return {
    permission,
    requestPermission,
    sendTestNotification,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isIOS: isIOS(),
    isPWAInstalled: isPWAInstalled(),
    needsPWAInstall: needsPWAInstall(),
  };
}