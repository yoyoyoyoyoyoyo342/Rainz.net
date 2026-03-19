import { useState } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cookie } from 'lucide-react';

export function CookieConsentBanner() {
  const { hasConsented, acceptAll, declineAll, savePreferences, preferences } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [customPrefs, setCustomPrefs] = useState({
    analytics: preferences?.analytics || false,
    functional: preferences?.functional || false,
  });

  // Hide on /dryroutes — immersive full-screen experience
  if (hasConsented || window.location.pathname === '/dryroutes') return null;

  const handleSaveCustom = () => {
    savePreferences({
      necessary: true,
      analytics: customPrefs.analytics,
      functional: customPrefs.functional,
    });
    setShowCustomize(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom">
        <Card className="max-w-4xl mx-auto p-6 bg-background/95 backdrop-blur-sm border-2">
          <div className="flex items-start gap-4">
            <Cookie className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-lg">May I please have some cookies? 🍪</h3>
              <p className="text-sm text-muted-foreground">
                We promise they're delicious! We use cookies to make your weather experience extra crispy. 
                By the way, our weather predictions are best guesses — don't blame us if you get caught in the rain! ☔
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={acceptAll} size="sm">
                  🍪 Take all of them!
                </Button>
                <Button onClick={() => setShowCustomize(true)} variant="outline" size="sm">
                  🤔 Let me pick
                </Button>
                <Button onClick={declineAll} variant="ghost" size="sm">
                  😢 No cookies for you
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies you'd like to allow. Necessary cookies are always enabled.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label className="font-semibold">Necessary Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Required for the app to function. Cannot be disabled.
                </p>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label htmlFor="analytics" className="font-semibold">Analytics Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use the app to improve your experience.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={customPrefs.analytics}
                onCheckedChange={(checked) => 
                  setCustomPrefs(prev => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label htmlFor="functional" className="font-semibold">Functional Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Enable enhanced features like saved preferences and personalization.
                </p>
              </div>
              <Switch
                id="functional"
                checked={customPrefs.functional}
                onCheckedChange={(checked) => 
                  setCustomPrefs(prev => ({ ...prev, functional: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCustomize(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustom}>
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
