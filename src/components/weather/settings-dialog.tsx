import { useState, useEffect } from "react";
import { Settings, Globe, LogOut, User, Eye, RotateCcw, GripVertical, Languages, Moon, Sun, Shield, Bell, Smartphone, Cookie, FlaskConical, Thermometer, Droplets, Wind, Gauge, Sunrise, MoonIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Language, languageFlags } from "@/contexts/language-context";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { usePremiumSettings } from "@/hooks/use-premium-settings";

interface SettingsDialogProps {
  isImperial: boolean;
  onUnitsChange: (isImperial: boolean) => void;
  mostAccurate?: any;
}

// Reusable section wrapper with glass styling
function SettingsSection({ title, icon: Icon, children, badge }: { 
  title: string; 
  icon?: any; 
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/40">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="font-medium text-sm">{title}</span>
        {badge}
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

// Toggle row component for consistent styling
function ToggleRow({ icon: Icon, label, description, checked, onCheckedChange, disabled }: {
  icon?: any;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
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
  } = useSortable({ id: cardKey });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="text-sm flex-1">{label}</span>
      <Switch checked={visible} onCheckedChange={onVisibilityChange} />
    </div>
  );
}

export function SettingsDialog({
  isImperial,
  onUnitsChange,
  mostAccurate
}: SettingsDialogProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
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

    if (enabled && needsPWAInstall) {
      setShowIOSInstallGuide(true);
      return;
    }

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

  const sensors = useSensors(
    useSensor(PointerSensor), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
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
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" />
              {t('settings.title')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t('settings.customise')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Account Section */}
            {user && (
              <SettingsSection title={t('settings.account')} icon={User}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
                    <LogOut className="w-3.5 h-3.5" />
                    {t('settings.signOut')}
                  </Button>
                </div>
              </SettingsSection>
            )}

            {/* Language Section */}
            <SettingsSection title={t('settings.language')} icon={Languages}>
              <div className="grid grid-cols-2 gap-2">
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
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      language === lang
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                        : 'border-border/60 hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-lg">{languageFlags[lang]}</span>
                    <span className="text-xs font-medium flex-1">{t(`language.${lang}`)}</span>
                    {language === lang && <span className="text-xs text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* Display Settings Section */}
            <SettingsSection title="Display" icon={Eye}>
              <ToggleRow
                icon={theme === 'dark' ? Moon : Sun}
                label="Dark mode"
                description={theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}
                checked={theme === 'dark'}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light');
                  toast({ title: "Theme updated", description: `Switched to ${checked ? 'dark' : 'light'} mode` });
                }}
              />
              <ToggleRow
                icon={Globe}
                label={t('settings.useCelsius')}
                description={isImperial ? t('settings.currentlyFahrenheit') : t('settings.currentlyCelsius')}
                checked={!isImperial}
                onCheckedChange={(checked) => onUnitsChange(!checked)}
              />
              <ToggleRow
                icon={Globe}
                label="Use 24-hour time"
                description={is24Hour ? 'Currently using 24-hour format' : 'Currently using 12-hour format'}
                checked={is24Hour}
                onCheckedChange={(checked) => {
                  updateTimeFormat(checked);
                  toast({ title: "Time format updated", description: `Now using ${checked ? '24-hour' : '12-hour'} format` });
                }}
              />
              <ToggleRow
                icon={Eye}
                label="High contrast mode"
                description={isHighContrast ? 'Enhanced contrast enabled' : 'Normal contrast'}
                checked={isHighContrast}
                onCheckedChange={(checked) => {
                  updateHighContrast(checked);
                  toast({ title: "High contrast mode updated", description: checked ? 'Enabled' : 'Disabled' });
                }}
              />
            </SettingsSection>

            {/* Display Settings */}
            <SettingsSection title="Advanced Display" icon={Eye}>
              <ToggleRow
                icon={FlaskConical}
                label="AI Enhanced Data"
                description="Weather data processed by AI for enhanced accuracy"
                checked={useExperimental}
                onCheckedChange={(checked) => {
                  setUseExperimental(checked);
                  toast({ title: "AI Enhanced Data", description: checked ? 'Enabled' : 'Disabled' });
                }}
              />
              <ToggleRow
                label="Animated backgrounds"
                description="Show animated weather effects"
                checked={premiumSettings.animatedBackgrounds}
                onCheckedChange={(checked) => {
                  updatePremiumSetting('animatedBackgrounds', checked);
                  toast({ title: "Animated Backgrounds", description: checked ? 'Enabled' : 'Disabled' });
                }}
              />
              <ToggleRow
                label="Compact mode"
                description="Use smaller, condensed cards"
                checked={premiumSettings.compactMode}
                onCheckedChange={(checked) => {
                  updatePremiumSetting('compactMode', checked);
                  toast({ title: "Compact Mode", description: checked ? 'Enabled' : 'Disabled' });
                }}
              />
              
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-3">Data to display:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'showFeelsLike', label: 'Feels like', icon: Thermometer },
                    { key: 'showWindChill', label: 'Wind chill', icon: Wind },
                    { key: 'showHumidity', label: 'Humidity', icon: Droplets },
                    { key: 'showUV', label: 'UV index', icon: Sun },
                    { key: 'showPrecipChance', label: 'Precip %', icon: Droplets },
                    { key: 'showDewPoint', label: 'Dew point', icon: Droplets },
                    { key: 'showPressure', label: 'Pressure', icon: Gauge },
                    { key: 'showVisibility', label: 'Visibility', icon: Eye },
                    { key: 'showSunTimes', label: 'Sun times', icon: Sunrise },
                    { key: 'showMoonPhase', label: 'Moon phase', icon: MoonIcon },
                  ].map(({ key, label, icon: ItemIcon }) => (
                    <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Switch
                        checked={(premiumSettings as any)[key]}
                        onCheckedChange={(checked) => updatePremiumSetting(key as any, checked)}
                        className="scale-75"
                      />
                      <ItemIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </SettingsSection>

            {/* Notifications Section */}
            <SettingsSection title="Notifications" icon={Bell}>
              {isIOS && !isPWAInstalled && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Installation Required</span>
                      </div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                        Notifications require Rainz to be installed to your home screen.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowIOSInstallGuide(true)}
                        className="w-full border-blue-500/30"
                      >
                        View Instructions
                      </Button>
                    </div>
                  )}
                  
                  <ToggleRow
                    icon={Bell}
                    label="Daily weather notifications"
                    description={notificationsEnabled ? 'Receive AI-powered morning updates' : 'Enable to get daily notifications'}
                    checked={notificationsEnabled}
                    disabled={loadingNotifications || (isIOS && !isPWAInstalled)}
                    onCheckedChange={(checked) => {
                      setNotificationsEnabled(checked);
                      updateNotificationSettings(checked);
                    }}
                  />

                  {notificationsEnabled && (
                    <>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="notification-time" className="text-sm flex-shrink-0">Time</Label>
                        <input
                          id="notification-time"
                          type="time"
                          value={notificationTime}
                          onChange={(e) => {
                            const newTime = e.target.value;
                            setNotificationTime(newTime);
                            updateNotificationSettings(true, newTime);
                          }}
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-xs text-muted-foreground">Notification types:</p>
                        {[
                          { key: 'severe_weather', label: 'Severe weather alerts' },
                          { key: 'pollen', label: 'Pollen alerts' },
                          { key: 'daily_summary', label: 'Daily summary' },
                          { key: 'ai_preview', label: 'AI weather preview' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm">{label}</span>
                            <Switch 
                              checked={notifySettings[key as keyof typeof notifySettings]}
                              onCheckedChange={(checked) => updateNotificationPreference(key as keyof typeof notifySettings, checked)}
                            />
                          </div>
                        ))}
                      </div>

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
                    </>
                  )}
            </SettingsSection>

            {/* Help & Feedback */}
            <SettingsSection title="Help & Feedback">
              <div className="space-y-2">
                <AISupportChat />
                <FeedbackForm />
              </div>
            </SettingsSection>

            {/* Privacy & Data */}
            <SettingsSection title="Privacy & Data" icon={Shield}>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-between h-auto py-2.5" onClick={() => navigate('/data-settings')}>
                  <span className="text-sm">Manage Data & Privacy</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" className="w-full justify-between h-auto py-2.5" onClick={() => navigate('/terms')}>
                  <span className="text-sm">Terms of Service</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" className="w-full justify-between h-auto py-2.5" onClick={() => navigate('/privacy')}>
                  <span className="text-sm">Privacy Policy</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </SettingsSection>

            {/* Cookie Preferences */}
            <SettingsSection title="Cookie Preferences" icon={Cookie}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Necessary</span>
                    <p className="text-xs text-muted-foreground">Required for app functionality</p>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Analytics</span>
                    <p className="text-xs text-muted-foreground">Help us improve the app</p>
                  </div>
                  <Switch
                    checked={cookiePreferences?.analytics || false}
                    onCheckedChange={(checked) => {
                      if (cookiePreferences) {
                        saveCookiePreferences({ ...cookiePreferences, analytics: checked });
                        toast({ title: "Cookie preferences updated" });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Functional</span>
                    <p className="text-xs text-muted-foreground">Enhanced features</p>
                  </div>
                  <Switch
                    checked={cookiePreferences?.functional || false}
                    onCheckedChange={(checked) => {
                      if (cookiePreferences) {
                        saveCookiePreferences({ ...cookiePreferences, functional: checked });
                        toast({ title: "Cookie preferences updated" });
                      }
                    }}
                  />
                </div>
              </div>
            </SettingsSection>

            {/* Card Visibility - Only for authenticated users */}
            {user && (
              <SettingsSection title={t('settings.cardVisibility')} icon={Eye}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{t('settings.reloadChanges')}</p>
                  <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-7 text-xs gap-1">
                    <RotateCcw className="w-3 h-3" />
                    {t('settings.reset')}
                  </Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {cardOrder.map(cardKey => (
                        <SortableCardItem 
                          key={cardKey} 
                          cardKey={cardKey} 
                          label={cardLabels[cardKey]} 
                          visible={visibleCards[cardKey]} 
                          onVisibilityChange={checked => updateVisibility(cardKey, checked)} 
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </SettingsSection>
            )}

            {/* Admin Panel Button */}
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate('/admin')}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <IOSInstallGuide 
        open={showIOSInstallGuide} 
        onOpenChange={setShowIOSInstallGuide} 
      />
    </>
  );
}