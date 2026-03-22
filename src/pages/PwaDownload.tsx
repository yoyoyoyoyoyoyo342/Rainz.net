import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

const PwaDownload = () => {
  const { getValue } = useFeatureFlags();
  const title = getValue("download_mobile_title", "Install Rainz on your device");
  const description = getValue("download_mobile_description", 'You can install Rainz directly from your browser. Visit rainz.net and select "Add to Home Screen" or "Install App" in your browser menu.');
  const cta = getValue("download_mobile_cta", "Install from Browser");

  const steps = [
    { title: "Open rainz.net in your browser", desc: "Use Safari on iOS or Chrome on Android" },
    { title: "Tap the share/menu icon", desc: "Look for the share button (iOS) or three-dot menu (Android)" },
    { title: 'Select "Add to Home Screen"', desc: "Or 'Install App' if prompted" },
    { title: "Open from your home screen", desc: "Rainz will launch like a native app" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link
          to="/download"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Downloads
        </Link>

        <div className="text-center mb-10">
          <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit">
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-4 mb-10">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {i + 1}
              </div>
              <div>
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {["Works offline", "Push notifications", "Fast & lightweight", "No app store needed"].map((f) => (
              <div key={f} className="flex items-center gap-2 p-3 rounded-lg border border-border/30 bg-card/30">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link to="/">
              <Button size="lg" className="gap-2">
                <Smartphone className="h-4 w-4" />
                {cta}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaDownload;
