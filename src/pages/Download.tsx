import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Apple, ArrowDownToLine, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadPage = () => {
  const handleMacDownload = () => {
    // TODO: Replace with actual .dmg download URL
    console.log("Mac download clicked - replace with actual URL");
    // window.location.href = "https://your-host.com/rainz.dmg";
  };

  const handleWindowsDownload = (https://github.com/8zhm9mc6r6-wq/rainz-weather-desktop/releases/download/Rainz/Rainz.Weather.Setup.V1.0exe) => {
    // TODO: Replace with actual .exe download URL
    console.log("Windows download clicked - replace with actual URL");
    // window.location.href = "https://your-host.com/rainz-setup.exe";
  };

  const features = [
    "Real-time weather notifications",
    "Faster performance",
    "Offline access",
    "System tray integration",
    "Native keyboard shortcuts",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Rainz
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Desktop App</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Download Rainz
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the full Rainz experience on your desktop. Faster, native, and always accessible.
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* macOS Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 w-fit">
                <Apple className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-2xl">macOS</CardTitle>
              <CardDescription>For Mac computers</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>macOS 11.0 or later</p>
                <p>Apple Silicon & Intel supported</p>
              </div>
              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleMacDownload}
              >
                <ArrowDownToLine className="h-5 w-5" />
                Download .dmg
              </Button>
              <p className="text-xs text-muted-foreground">Version 1.0.0 • Coming Soon</p>
            </CardContent>
          </Card>

          {/* Windows Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 w-fit">
                <Monitor className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-2xl">Windows</CardTitle>
              <CardDescription>For Windows PCs</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Windows 10 or later</p>
                <p>64-bit required</p>
              </div>
              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleWindowsDownload}
              >
                <ArrowDownToLine className="h-5 w-5" />
                Download .exe
              </Button>
              <p className="text-xs text-muted-foreground">Version 1.0.0 • Coming Soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-6">Why download the desktop app?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg bg-card border"
              >
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PWA Alternative */}
        <div className="max-w-2xl mx-auto mt-12 p-6 rounded-xl bg-muted/50 border text-center">
          <h3 className="font-semibold mb-2">Don't want to download?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can install Rainz directly from your browser. Just visit{" "}
            <Link to="/" className="text-primary hover:underline">rainz.net</Link>{" "}
            and click "Add to Home Screen" or "Install App" in your browser menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
