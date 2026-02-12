import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, User, Target, Loader2, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { weatherApi } from "@/lib/weather-api";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";

const displayNameSchema = z.string()
  .trim()
  .min(3, "Display name must be at least 3 characters")
  .max(20, "Display name must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_\- ]+$/, {
    message: "Only letters, numbers, spaces, hyphens, underscores"
  })
  .refine(name => name.replace(/\s/g, '').length >= 3, {
    message: "Must contain at least 3 non-space characters"
  });

interface OnboardingFlowProps {
  open: boolean;
  onComplete: (location?: { lat: number; lon: number; name: string }) => void;
  userId: string;
}

export function OnboardingFlow({ open, onComplete, userId }: OnboardingFlowProps) {
  const [step, setStep] = useState(0); // 0: location, 1: display name, 2: prediction teaser
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);

  const steps = [
    { icon: MapPin, label: "Location" },
    { icon: User, label: "Name" },
    { icon: Target, label: "Get Started" },
  ];

  const handleAllowLocation = async () => {
    setLoading(true);
    try {
      const position = await weatherApi.getCurrentLocation();
      const { latitude, longitude } = position.coords;

      // Try to get a human-readable name
      let name = "Current Location";
      try {
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await resp.json();
        name = data?.locality || data?.city || data?.principalSubdivision || "Current Location";
      } catch {}

      // Save permission
      localStorage.setItem("rainz-location-permission-granted", "true");

      setDetectedLocation({ lat: latitude, lon: longitude, name });
      setLocationDetected(true);
      toast.success(`📍 Location detected: ${name}`);

      // Auto-advance after brief delay
      setTimeout(() => setStep(1), 600);
    } catch {
      toast.error("Location access denied. You can search manually later.");
      setTimeout(() => setStep(1), 600);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipLocation = () => {
    setStep(1);
  };

  const handleSaveName = async () => {
    try {
      displayNameSchema.parse(displayName);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Name saved!");
      setStep(2);
    } catch {
      toast.error("Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    // Mark onboarding complete
    localStorage.setItem("rainz-onboarding-complete", "true");
    onComplete(detectedLocation || undefined);
  };

  const progress = ((step + 1) / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Progress */}
        <div className="px-6 pt-6">
          <Progress value={progress} className="h-1.5 mb-6" />
          <div className="flex justify-between mb-6">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary/20 text-primary ring-2 ring-primary" :
                  "bg-muted/30 text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Step 0: Location */}
          {step === 0 && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Enable Location</h2>
                <p className="text-sm text-muted-foreground">
                  Get hyper-local weather forecasts tailored to your exact location.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleAllowLocation} disabled={loading || locationDetected} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : locationDetected ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  {loading ? "Detecting..." : locationDetected ? "Location Detected!" : "Allow Location Access"}
                </Button>
                <Button variant="ghost" onClick={handleSkipLocation} className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Display Name */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Choose Your Name</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a display name for the leaderboard and battles.
                </p>
              </div>
              <div className="space-y-3 text-left">
                <Label htmlFor="onboarding-name">Display Name</Label>
                <Input
                  id="onboarding-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="WeatherWiz42"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">3-20 characters</p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleSaveName} disabled={loading || !displayName.trim()} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? "Saving..." : "Continue"}
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)} className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Get Started */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">You're All Set! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  Make daily weather predictions to earn points, climb the leaderboard, and compete with friends.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="text-2xl mb-1">🎯</div>
                  <p className="text-xs text-muted-foreground">Predict</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="text-2xl mb-1">🏆</div>
                  <p className="text-xs text-muted-foreground">Compete</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="text-2xl mb-1">⚡</div>
                  <p className="text-xs text-muted-foreground">Earn Points</p>
                </div>
              </div>
              <Button onClick={handleFinish} className="w-full gap-2">
                <Target className="w-4 h-4" />
                Start Exploring
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
