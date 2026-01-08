import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Apple, ArrowDownToLine, CheckCircle, ArrowLeft } from "lucide-react";
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

  const features = [
    "Real-time weather notifications",
    "Faster performance",
    "Offline access",
    "System tray integration",
    "Native keyboard shortcuts",
  ];

  const macBypassSteps = [
    "Download the `.dmg` file above.",
    "Try to open the app. macOS will block it.",
    "Open System Settings → Privacy & Security.",
    "At the bottom, you’ll see “Rainz Weather was blocked” → click Open Anyway.",
    "Confirm the prompt. Now Rainz Weather will open normally.",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rainz
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 text-lg">
            Desktop App
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Rainz Desktop Downloads</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get Rainz on your computer. Fast, native, and packed with features for Mac and Windows.
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* macOS Card */}
          <Card className="relative overflow-hidden border border-gray-200 rounded-xl hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 w-fit">
                <Apple className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-black">macOS</CardTitle>
              <CardDescription>For Mac computers (Intel & Apple Silicon)</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-sm text-gray-500">
                <p>macOS 11.0 or later</p>
              </div>
              <Button size="lg" className="w-full gap-2" onClick={handleMacDownload}>
                <ArrowDownToLine className="h-5 w-5" />
                Download .dmg
              </Button>
              <p className="text-xs text-gray-400">Version 1.0.0</p>
            </CardContent>
          </Card>

          {/* Windows Card */}
          <Card className="relative overflow-hidden border border-gray-200 rounded-xl hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 w-fit">
                <Monitor className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-black">Windows</CardTitle>
              <CardDescription>For Windows 10 or later (64-bit)</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button size="lg" className="w-full gap-2" onClick={handleWindowsDownload}>
                <ArrowDownToLine className="h-5 w-5" />
                Download .exe
              </Button>
              <p className="text-xs text-gray-400">Version 1.0.0</p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Why download Rainz?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg bg-white border border-gray-200 shadow-sm"
              >
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* macOS Bypass Instructions */}
        <div className="max-w-2xl mx-auto mb-12 p-6 rounded-xl bg-gray-50 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">macOS Users — Opening Unsigned Apps</h3>
          <p className="text-gray-600 mb-3">
            Because we don’t have a paid Apple Developer ID, macOS will warn you when opening Rainz Weather. Follow
            these steps:
          </p>
          <ol className="list-decimal list-inside text-gray-700 space-y-2">
            {macBypassSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>

        {/* PWA Alternative */}
        <div className="max-w-2xl mx-auto mt-12 p-6 rounded-xl bg-white border border-gray-200 shadow-sm text-center">
          <h3 className="font-semibold mb-2 text-gray-900">Prefer not to download?</h3>
          <p className="text-gray-600 mb-4">
            You can install Rainz directly from your browser. Visit{" "}
            <Link to="/" className="text-blue-600 hover:underline">
              rainz.net
            </Link>{" "}
            and select "Add to Home Screen" or "Install App" in your browser menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
