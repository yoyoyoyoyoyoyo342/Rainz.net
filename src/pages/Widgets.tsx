import { SEOHead } from "@/components/seo/seo-head";
import { WidgetGenerator } from "@/components/weather/widget-generator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetsPage() {
  return (
    <>
      <SEOHead
        title="Embeddable Weather Widgets - Rainz"
        description="Create customizable weather widgets for your website. Choose themes, sizes, and data displays with our easy embed code generator."
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Weather
              </Link>
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">Weather Widgets</h1>
            <p className="text-muted-foreground">
              Create beautiful, customizable weather widgets for your website. 
              Configure your widget below and copy the embed code.
            </p>
          </div>

          {/* Widget Generator */}
          <WidgetGenerator />

          {/* Instructions */}
          <div className="mt-12 prose prose-sm dark:prose-invert max-w-none">
            <h2>How to Use</h2>
            <ol>
              <li><strong>Select a location</strong> - Search for the city you want to display weather for</li>
              <li><strong>Customize appearance</strong> - Choose theme, size, and display options</li>
              <li><strong>Set dimensions</strong> - Adjust width and height to fit your layout</li>
              <li><strong>Copy the code</strong> - Paste the iframe code into your website's HTML</li>
            </ol>

            <h2>Features</h2>
            <ul>
              <li>Real-time weather data from multiple sources</li>
              <li>4 beautiful themes: Light, Dark, Glass, and Minimal</li>
              <li>3 size presets: Small, Medium, and Large</li>
              <li>Optional hourly forecast display</li>
              <li>Metric or Imperial units</li>
              <li>Auto-refreshes every 10 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
