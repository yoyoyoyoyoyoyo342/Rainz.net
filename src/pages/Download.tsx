import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Apple, ArrowDownToLine, Smartphone, Globe, Zap, Bell, Wifi, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadPage = () => {

  const handleMacDownload = () => {
    window.location.href =
      "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.V1.0.dmg";
  };

  const handleWindowsDownload = () => {
    window.location.href =
      "https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.Setup.V1.0.exe";
  };

  const desktopFeatures = [
    { icon: Zap, text: "Native performance" },
    { icon: Bell, text: "System notifications" },
    { icon: Wifi, text: "Offline support" },
  ];

  const pwaFeatures = [
    { icon: Globe, text: "Works everywhere" },
    { icon: Smartphone, text: "Home screen app" },
    { icon: Bell, text: "Push notifications" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Get Rainz
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Choose how you want to use Rainz Weather
          </p>
        </div>

        {/* Main options grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Desktop Apps */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b border-border">
              <Badge className="mb-3">Desktop</Badge>
              <h2 className="text-xl font-semibold mb-1">Desktop App</h2>
              <p className="text-sm text-muted-foreground">
                Full native experience for Mac and Windows
              </p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4">
                {desktopFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <feature.icon className="h-4 w-4 text-primary" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full justify-between" 
                  onClick={handleMacDownload}
                >
                  <span className="flex items-center gap-2">
                    <Apple className="h-5 w-5" />
                    macOS
                  </span>
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full justify-between" 
                  onClick={handleWindowsDownload}
                >
                  <span className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Windows
                  </span>
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                v1.0.0 • macOS 11+ / Windows 10+
              </p>
            </CardContent>
          </Card>

          {/* PWA / Web */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 p-6 border-b border-border">
              <Badge variant="secondary" className="mb-3">Web App</Badge>
              <h2 className="text-xl font-semibold mb-1">Install from Browser</h2>
              <p className="text-sm text-muted-foreground">
                Add to home screen on any device
              </p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4">
                {pwaFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <feature.icon className="h-4 w-4 text-primary" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <p className="text-sm font-medium">How to install:</p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground">1.</span>
                    Visit <a href="https://rainz.net" className="text-primary hover:underline">rainz.net</a> in your browser
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground">2.</span>
                    Tap the share/menu button
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground">3.</span>
                    Select "Add to Home Screen" or "Install App"
                  </li>
                </ol>
              </div>

              <Button 
                size="lg" 
                variant="secondary"
                className="w-full" 
                asChild
              >
                <Link to="/">
                  <Globe className="h-4 w-4 mr-2" />
                  Open Rainz Web
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-muted-foreground">
          All versions sync your saved locations when signed in
        </p>
      </div>
    </div>
  );
};

export default DownloadPage;