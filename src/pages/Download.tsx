import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rainz
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Download Rainz</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose how you want to use Rainz — install on your phone or download the desktop app.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <Card className="border border-border/50 rounded-2xl hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit">
                <Smartphone className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">Mobile / PWA</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Install directly from your browser on any device</p>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/pwadownload">
                <Button size="lg" className="w-full">View Instructions</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-border/50 rounded-2xl hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit">
                <Monitor className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">Desktop App</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Download for macOS and Windows</p>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/appdownload">
                <Button size="lg" className="w-full">View Downloads</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
