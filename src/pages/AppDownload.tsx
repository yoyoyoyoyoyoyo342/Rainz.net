import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Apple, ArrowDownToLine, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

const AppDownload = () => {
  const { getValue } = useFeatureFlags();

  const macUrl = getValue("download_mac_url", "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.V1.0.dmg");
  const winUrl = getValue("download_win_url", "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.Setup.V1.0.exe");
  const macVersion = getValue("download_mac_version", "1.0.0");
  const winVersion = getValue("download_win_version", "1.0.0");
  const macInstructionsRaw = getValue("download_mac_instructions", "Download the .dmg file above.\nTry to open the app. macOS will block it.\nOpen System Settings → Privacy & Security.\nAt the bottom, you'll see \"Rainz Weather was blocked\" → click Open Anyway.\nConfirm the prompt. Now Rainz Weather will open normally.");
  const macBypassSteps = macInstructionsRaw.split("\n").filter(Boolean);

  const features = [
    "Real-time weather notifications",
    "Faster performance",
    "Offline access",
    "System tray integration",
    "Native keyboard shortcuts",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-12">
        <Link
          to="/download"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Downloads
        </Link>

        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 text-lg">Desktop App</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Rainz Desktop Downloads</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get Rainz on your computer. Fast, native, and packed with features for Mac and Windows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          <Card className="relative overflow-hidden border border-border/50 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-muted w-fit">
                <Apple className="h-12 w-12 text-foreground" />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">macOS</CardTitle>
              <CardDescription>For Mac computers (Intel & Apple Silicon)</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">macOS 11.0 or later</p>
              <Button size="lg" className="w-full gap-2" onClick={() => { window.location.href = macUrl; }}>
                <ArrowDownToLine className="h-5 w-5" />
                Download .dmg
              </Button>
              <p className="text-xs text-muted-foreground">Version {macVersion}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/50 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit">
                <Monitor className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">Windows</CardTitle>
              <CardDescription>For Windows 10 or later (64-bit)</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button size="lg" className="w-full gap-2" onClick={() => { window.location.href = winUrl; }}>
                <ArrowDownToLine className="h-5 w-5" />
                Download .exe
              </Button>
              <p className="text-xs text-muted-foreground">Version {winVersion}</p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Why download Rainz?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card/50">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12 p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-xl font-semibold mb-4 text-foreground">macOS Users — Opening Unsigned Apps</h3>
          <p className="text-muted-foreground mb-3">
            Because we don't have a paid Apple Developer ID, macOS will warn you when opening Rainz Weather. Follow these steps:
          </p>
          <ol className="list-decimal list-inside text-foreground space-y-2">
            {macBypassSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AppDownload;
