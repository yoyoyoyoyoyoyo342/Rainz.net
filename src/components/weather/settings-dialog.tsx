import { useState, useEffect } from "react";
import { Settings, Globe, LogOut, User, Eye, RotateCcw, GripVertical, Languages, Moon, Sun, Shield, Bell, Smartphone, Cookie, FileText, FlaskConical, Crown, Lock, Thermometer, Droplets, Wind, Gauge, Sunrise, MoonIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Language, languageFlags } from "@/contexts/language-context";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { FeedbackForm } from "./feedback-form";
import { AISupportChat } from "./ai-support-chat";
import { useTheme } from "@/components/theme-provider";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useNavigate } from "react-router-dom";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { IOSInstallGuide } from "@/components/ui/ios-install-guide";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useExperimentalData } from "@/hooks/use-experimental-data";
import { useSubscription } from "@/hooks/use-subscription";
import { usePremiumSettings } from "@/hooks/use-premium-settings";

interface SettingsDialogProps {
  isImperial: boolean;
  onUnitsChange: (isImperial: boolean) => void;
  mostAccurate?: any;
}
function SortableCardItem({
  cardKey,
  label,
  visible,
  onVisibilityChange
}: {
  cardKey: string;
  label: string;
  visible: boolean;
  onVisibilityChange: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: cardKey
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border cursor-move">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 flex-1">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={visible} onCheckedChange={onVisibilityChange} />
    </div>;
}
export function SettingsDialog({
  isImperial,
  onUnitsChange,
  mostAccurate
}: SettingsDialogProps) {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    visibleCards,
    cardOrder,
    is24Hour,
    isHighContrast,
    updateVisibility,
    updateOrder,
    updateTimeFormat,
    updateHighContrast,
    resetToDefaults
  } = useUserPreferences();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const { isIOS, isPWAInstalled, needsPWAInstall, requestPermission: requestNotificationPermission, sendTestNotification } = usePushNotifications();
  const { preferences: cookiePreferences, savePreferences: saveCookiePreferences } = useCookieConsent();
  const { useExperimental, setUseExperimental } = useExperimentalData();
  const { isSubscribed, openCheckout, openPortal } = useSubscription();
  const { settings: premiumSettings, updateSetting: updatePremiumSetting } = usePremiumSettings();
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('08:00');
  const [notifySettings, setNotifySettings] = useState({
    severe_weather: true,
    pollen: true,
    daily_summary: true,
    ai_preview: true,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotificationSettings();
    }
  }, [user]);

  async function loadNotificationSettings() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_enabled, notification_time, notify_severe_weather, notify_pollen, notify_daily_summary, notify_ai_preview')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setNotificationsEnabled(data.notification_enabled || false);
        setNotificationTime(data.notification_time || '08:00');
        setNotifySettings({
          severe_weather: data.notify_severe_weather ?? true,
          pollen: data.notify_pollen ?? true,
          daily_summary: data.notify_daily_summary ?? true,
          ai_preview: data.notify_ai_preview ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function updateNotificationSettings(enabled: boolean, time?: string) {
    if (!user) return;

    // If user is on iOS and not installed, show install guide instead
    if (enabled && needsPWAInstall) {
      setShowIOSInstallGuide(true);
      return;
    }

    // Request browser notification permission if enabling
    if (enabled && !needsPWAInstall) {
      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        setNotificationsEnabled(false);
        return;
      }
    }

    try {
      const updates: any = { notification_enabled: enabled };
      if (time !== undefined) {
        updates.notification_time = time;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Notifications updated",
        description: enabled 
          ? `Daily notifications enabled for ${time || notificationTime}` 
          : "Notifications disabled"
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
    }
  }

  async function updateNotificationPreference(type: keyof typeof notifySettings, enabled: boolean) {
    if (!user) return;

    const columnMap = {
      severe_weather: 'notify_severe_weather',
      pollen: 'notify_pollen',
      daily_summary: 'notify_daily_summary',
      ai_preview: 'notify_ai_preview',
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [columnMap[type]]: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifySettings(prev => ({ ...prev, [type]: enabled }));

      toast({
        title: "Preference updated",
        description: `${type.replace('_', ' ')} notifications ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preference",
        variant: "destructive"
      });
    }
  }
  const cardLabels = {
    pollen: t('pollen.pollenIndex'),
    hourly: t('pollen.hourlyForecast'),
    tenDay: t('pollen.tenDayForecast'),
    detailedMetrics: t('pollen.detailedMetrics'),
    weatherTrends: 'Weather Trends',
    aqi: 'Air Quality Index',
    alerts: 'Weather Alerts'
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "Please try again."
      });
    }
  };
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as any);
      const newIndex = cardOrder.indexOf(over.id as any);
      const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
      updateOrder(newOrder);
      toast({
        title: "Card order updated",
        description: "Your card layout has been saved"
      });
    }
  };
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-foreground hover:text-primary rounded-xl">
            <Settings className="w-5 h-5" />
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.customise')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 overflow-y-auto flex-1 px-1">
          {/* User Profile */}
          {user && <>
              <div className="space-y-3">
                <Label className="text-base font-medium">{t('settings.account')}</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-3 h-3 mr-2" />
                    {t('settings.signOut')}
                  </Button>
                </div>
              </div>
              <Separator />
            </>}

          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Languages className="w-4 h-4" />
              {t('settings.language')}
            </Label>
            <div className="grid gap-2">
              {(['en-GB', 'en-US', 'da', 'sv', 'no', 'fr', 'it'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    toast({
                      title: t('settings.languageChanged'),
                      description: `${t('settings.changedTo')} ${t(`language.${lang}`)}`,
                    });
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    language === lang
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-2xl">{languageFlags[lang]}</span>
                  <span className="text-sm font-medium">{t(`language.${lang}`)}</span>
                  {language === lang && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Feedback & Support */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Help & Feedback</Label>
            <AISupportChat />
            <FeedbackForm />
          </div>

          <Separator />

          {/* Display Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Display Settings</Label>
            
            {/* Dark Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Dark mode</span>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={(checked) => {
                    setTheme(checked ? 'dark' : 'light');
                    toast({
                      title: "Theme updated",
                      description: `Switched to ${checked ? 'dark' : 'light'} mode`
                    });
                  }} 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}
              </p>
            </div>

            {/* Temperature Units */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{t('settings.useCelsius')}</span>
                </div>
                <Switch checked={!isImperial} onCheckedChange={checked => onUnitsChange(!checked)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {isImperial ? t('settings.currentlyFahrenheit') : t('settings.currentlyCelsius')}
              </p>
            </div>

            {/* Time Format */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Use 24-hour time</span>
                </div>
                <Switch 
                  checked={is24Hour} 
                  onCheckedChange={(checked) => {
                    updateTimeFormat(checked);
                    toast({
                      title: "Time format updated",
                      description: `Now using ${checked ? '24-hour' : '12-hour'} time format`
                    });
                  }} 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {is24Hour ? 'Currently using 24-hour format (e.g., 15:30)' : 'Currently using 12-hour format (e.g., 3:30 PM)'}
              </p>
            </div>

            {/* High Contrast Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">High contrast mode</span>
                </div>
                <Switch 
                  checked={isHighContrast} 
                  onCheckedChange={(checked) => {
                    updateHighContrast(checked);
                    toast({
                      title: "High contrast mode updated",
                      description: `High contrast mode ${checked ? 'enabled' : 'disabled'}`
                    });
                  }} 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isHighContrast ? 'Text is displayed with enhanced contrast' : 'Text is displayed with normal contrast'}
              </p>
            </div>

            {/* Experimental Data - Premium Feature (Always on for subscribers) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">AI Enhanced Data</span>
                  {isSubscribed ? (
                    <span className="flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      Plus
                    </span>
                  )}
                </div>
                {!isSubscribed && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      // Errors are surfaced via toast inside openCheckout
                      void openCheckout().catch(() => {});
                    }}
                    className="text-xs"
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Upgrade
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isSubscribed 
                  ? 'Weather data is processed by AI for enhanced accuracy (always on with Rainz+)'
                  : 'Upgrade to Rainz+ to use AI-processed weather data'}
              </p>
            </div>
          </div>

          {/* Rainz+ Premium Settings */}
          {isSubscribed && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  Rainz+ Display Settings
                </Label>
                <p className="text-xs text-muted-foreground">
                  These settings are synced to your account and apply across all devices.
                </p>
                
                {/* AI Enhanced Data Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">AI Enhanced Data</span>
                    </div>
                    <Switch 
                      checked={useExperimental}
                      onCheckedChange={(checked) => {
                        setUseExperimental(checked);
                        toast({
                          title: "AI Enhanced Data",
                          description: checked ? 'Enabled - Weather data will be AI-processed' : 'Disabled'
                        });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use AI-processed weather data for enhanced accuracy
                  </p>
                </div>

                {/* Animated Weather Background Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Animated backgrounds</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.animatedBackgrounds}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('animatedBackgrounds', checked);
                        toast({
                          title: "Animated Backgrounds",
                          description: checked ? 'Weather animations enabled' : 'Animations disabled for better performance'
                        });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Show animated weather effects in the background
                  </p>
                </div>

                {/* Compact Mode Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Compact mode</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.compactMode}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('compactMode', checked);
                        toast({
                          title: "Compact Mode",
                          description: checked ? 'Showing condensed weather cards' : 'Showing full weather cards'
                        });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use smaller, more condensed weather cards
                  </p>
                </div>

                {/* Show Feels Like Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show "feels like" temperature</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showFeelsLike}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showFeelsLike', checked);
                        toast({
                          title: "Feels Like Temperature",
                          description: checked ? 'Showing feels like temperature' : 'Hiding feels like temperature'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Wind Chill/Heat Index Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show wind chill & heat index</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showWindChill}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showWindChill', checked);
                        toast({
                          title: "Wind Chill & Heat Index",
                          description: checked ? 'Showing wind chill and heat index' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Humidity Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show humidity on main display</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showHumidity}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showHumidity', checked);
                        toast({
                          title: "Humidity Display",
                          description: checked ? 'Showing humidity' : 'Hiding humidity from main display'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show UV Index Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show UV index</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showUV}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showUV', checked);
                        toast({
                          title: "UV Index",
                          description: checked ? 'Showing UV index' : 'Hiding UV index'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Precipitation Chance Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Show precipitation chance</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showPrecipChance}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showPrecipChance', checked);
                        toast({
                          title: "Precipitation Chance",
                          description: checked ? 'Showing precipitation chance' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Dew Point Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show dew point</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showDewPoint}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showDewPoint', checked);
                        toast({
                          title: "Dew Point",
                          description: checked ? 'Showing dew point' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Pressure Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show barometric pressure</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showPressure}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showPressure', checked);
                        toast({
                          title: "Barometric Pressure",
                          description: checked ? 'Showing pressure readings' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Visibility Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show visibility</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showVisibility}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showVisibility', checked);
                        toast({
                          title: "Visibility",
                          description: checked ? 'Showing visibility distance' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Sun Times Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show sunrise/sunset times</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showSunTimes}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showSunTimes', checked);
                        toast({
                          title: "Sun Times",
                          description: checked ? 'Showing sunrise and sunset' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Show Moon Phase Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MoonIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Show moon phase</span>
                    </div>
                    <Switch 
                      checked={premiumSettings.showMoonPhase}
                      onCheckedChange={(checked) => {
                        updatePremiumSetting('showMoonPhase', checked);
                        toast({
                          title: "Moon Phase",
                          description: checked ? 'Showing current moon phase' : 'Hidden'
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Manage Subscription */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    openPortal().catch(() => {});
                  }}
                  className="w-full mt-2"
                >
                  Manage Subscription
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Notification Settings - Premium Only */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              Notifications
              {!isSubscribed && (
                <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" />
                  Plus
                </span>
              )}
            </Label>
            
            {!isSubscribed ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Premium Feature
                  </span>
                </div>
                <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
                  Upgrade to Rainz+ to receive AI-powered daily weather notifications with personalized insights.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    void openCheckout().catch(() => {});
                  }}
                  className="w-full border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Lock className="w-3 h-3 mr-2" />
                  Upgrade to Rainz+
                </Button>
              </div>
            ) : (
              <>
                {/* iOS PWA Installation Status */}
                {isIOS && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {isPWAInstalled ? 'PWA Installed ✓' : 'Installation Required'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600/90 dark:text-blue-400/90">
                      {isPWAInstalled 
                        ? 'Rainz is installed. You can enable notifications below.'
                        : 'Notifications only work when Rainz is installed to your home screen.'}
                    </p>
                    {!isPWAInstalled && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowIOSInstallGuide(true)}
                        className="w-full mt-2 border-blue-500/30 hover:bg-blue-500/10"
                      >
                        View Installation Instructions
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Enable Notifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Daily weather notifications</span>
                    </div>
                    <Switch 
                      checked={notificationsEnabled}
                      disabled={loadingNotifications || (isIOS && !isPWAInstalled)}
                      onCheckedChange={(checked) => {
                        setNotificationsEnabled(checked);
                        updateNotificationSettings(checked);
                      }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notificationsEnabled 
                      ? 'Receive AI-powered morning weather updates' 
                      : isIOS && !isPWAInstalled
                        ? 'Install Rainz to enable notifications'
                        : 'Enable to get daily weather notifications'}
                  </p>
                </div>

                {/* Notification Time */}
                {notificationsEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="notification-time" className="text-sm">
                      Notification time
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="notification-time"
                        type="time"
                        value={notificationTime}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setNotificationTime(newTime);
                          updateNotificationSettings(true, newTime);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You'll receive notifications at {notificationTime} daily
                    </p>
                  </div>
                )}

                {/* Test Notification Button */}
                {notificationsEnabled && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        await sendTestNotification({
                          temperature: 72,
                          condition: 'Partly Cloudy',
                          highTemp: 78,
                          lowTemp: 65,
                          pollenAlerts: ['Grass pollen: Moderate']
                        });
                      }}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Send Test Notification
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Test your notification settings with a sample weather update
                    </p>
                  </div>
                )}

                {/* Notification Type Preferences */}
                {notificationsEnabled && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-medium">Notification types</Label>
                    
                    <div className="space-y-2 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Severe weather alerts</span>
                        <Switch 
                          checked={notifySettings.severe_weather}
                          onCheckedChange={(checked) => updateNotificationPreference('severe_weather', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pollen alerts</span>
                        <Switch 
                          checked={notifySettings.pollen}
                          onCheckedChange={(checked) => updateNotificationPreference('pollen', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily summary</span>
                        <Switch 
                          checked={notifySettings.daily_summary}
                          onCheckedChange={(checked) => updateNotificationPreference('daily_summary', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">AI weather preview</span>
                        <Switch 
                          checked={notifySettings.ai_preview}
                          onCheckedChange={(checked) => updateNotificationPreference('ai_preview', checked)}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Choose which types of weather notifications you want to receive
                    </p>
                  </div>
                )}

                {/* Offline Cache Status */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Offline Weather Cache</span>
                    <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weather data is cached for offline access. Data expires after 6 hours.
                  </p>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Data & Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Data & Privacy Settings</Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/data-settings')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Manage Data & Privacy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/terms')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/privacy')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </div>
          </div>

          <Separator />

          {/* Cookie Preferences */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4" />
              <Label className="text-base font-medium">Cookie Preferences</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage your cookie and privacy settings
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Necessary Cookies</span>
                  <p className="text-xs text-muted-foreground">Required for app functionality</p>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Analytics Cookies</span>
                  <p className="text-xs text-muted-foreground">Help us improve the app</p>
                </div>
                <Switch
                  checked={cookiePreferences?.analytics || false}
                  onCheckedChange={(checked) => {
                    if (cookiePreferences) {
                      saveCookiePreferences({ ...cookiePreferences, analytics: checked });
                      toast({
                        title: "Cookie preferences updated",
                        description: checked 
                          ? "Analytics tracking enabled" 
                          : "Analytics tracking disabled",
                      });
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Functional Cookies</span>
                  <p className="text-xs text-muted-foreground">Enhanced features and personalization</p>
                </div>
                <Switch
                  checked={cookiePreferences?.functional || false}
                  onCheckedChange={(checked) => {
                    if (cookiePreferences) {
                      saveCookiePreferences({ ...cookiePreferences, functional: checked });
                      toast({
                        title: "Cookie preferences updated",
                        description: checked 
                          ? "Functional features enabled" 
                          : "Functional features disabled",
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />


          {/* Card Visibility - Only for authenticated users */}
          {user && <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t('settings.cardVisibility')}</Label>
                  <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-8 text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {t('settings.reset')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.reloadChanges')}</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {cardOrder.map(cardKey => <SortableCardItem key={cardKey} cardKey={cardKey} label={cardLabels[cardKey]} visible={visibleCards[cardKey]} onVisibilityChange={checked => updateVisibility(cardKey, checked)} />)}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>}

          {/* Admin Panel Button - Only for admins */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* iOS Install Guide Dialog */}
    <IOSInstallGuide 
      open={showIOSInstallGuide} 
      onOpenChange={setShowIOSInstallGuide} 
    />
    </>
  );
}