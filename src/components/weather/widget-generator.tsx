import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Code, ExternalLink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";

interface WidgetGeneratorProps {
  defaultLocation?: { lat: number; lon: number; name: string };
}

export function WidgetGenerator({ defaultLocation }: WidgetGeneratorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const [location, setLocation] = useState(defaultLocation || { lat: 0, lon: 0, name: "" });
  const [theme, setTheme] = useState<"light" | "dark" | "glass" | "minimal">("light");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [showHourly, setShowHourly] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [width, setWidth] = useState("320");
  const [height, setHeight] = useState("280");

  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["widget-location-search", searchQuery],
    queryFn: () => weatherApi.searchLocations(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const baseUrl = "https://rainz.lovable.app/widget";
  
  const widgetUrl = `${baseUrl}?lat=${location.lat}&lon=${location.lon}&location=${encodeURIComponent(location.name)}&theme=${theme}&size=${size}&units=${units}&hourly=${showHourly}&details=${showDetails}`;

  const iframeCode = `<iframe 
  src="${widgetUrl}" 
  width="${width}" 
  height="${height}" 
  frameborder="0" 
  style="border-radius: 12px; overflow: hidden;"
  title="Rainz Weather Widget"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Embed code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLocationSelect = (loc: { latitude: number; longitude: number; name: string }) => {
    setLocation({ lat: loc.latitude, lon: loc.longitude, name: loc.name });
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Widget Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                placeholder="Search for a city..."
                className="pl-9"
              />
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((result: any, i: number) => (
                    <button
                      key={i}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => handleLocationSelect(result)}
                    >
                      {result.name}{result.state ? `, ${result.state}` : ""}{result.country ? `, ${result.country}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {location.name && (
              <p className="text-xs text-muted-foreground">
                Selected: {location.name} ({location.lat.toFixed(2)}, {location.lon.toFixed(2)})
              </p>
            )}
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label>Size</Label>
            <Select value={size} onValueChange={(v: any) => setSize(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Units */}
          <div className="space-y-2">
            <Label>Temperature Units</Label>
            <Select value={units} onValueChange={(v: any) => setUnits(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Celsius (°C)</SelectItem>
                <SelectItem value="imperial">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <Label htmlFor="hourly">Show Hourly Forecast</Label>
            <Switch id="hourly" checked={showHourly} onCheckedChange={setShowHourly} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="details">Show Details</Label>
            <Switch id="details" checked={showDetails} onCheckedChange={setShowDetails} />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Width (px)</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Height (px)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Code */}
      <div className="space-y-4">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview</span>
              <Button variant="ghost" size="sm" asChild>
                <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="rounded-xl overflow-hidden border bg-muted/30"
              style={{ width: `${Math.min(parseInt(width), 400)}px`, height: `${Math.min(parseInt(height), 400)}px` }}
            >
              {location.lat !== 0 ? (
                <iframe
                  src={widgetUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Widget Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select a location to preview
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle>Embed Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {iframeCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Copy this code and paste it into your website's HTML where you want the widget to appear.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
