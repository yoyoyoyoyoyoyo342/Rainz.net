import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Code, ExternalLink, Search, Monitor, Tablet, Smartphone, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetConfig {
  location: { lat: number; lon: number; name: string };
  theme: "light" | "dark" | "glass" | "minimal";
  size: "small" | "medium" | "large";
  units: "metric" | "imperial";
  showHourly: boolean;
  showDetails: boolean;
  width: string;
  height: string;
  accentColor: string;
  borderRadius: number;
  fontSize: "small" | "medium" | "large";
}

const SIZE_PRESETS = [
  { key: "small", label: "Small", w: "280", h: "200", desc: "Sidebar widget" },
  { key: "medium", label: "Medium", w: "320", h: "280", desc: "Standard card" },
  { key: "large", label: "Large", w: "400", h: "400", desc: "Full dashboard" },
] as const;

const PREVIEW_WIDTHS = {
  mobile: 320,
  tablet: 500,
  desktop: 700,
};

const POPULAR_WIDGETS = [
  { name: "Minimal Dark", theme: "dark" as const, size: "small" as const, showHourly: false, showDetails: false },
  { name: "Full Dashboard", theme: "light" as const, size: "large" as const, showHourly: true, showDetails: true },
  { name: "Glass Card", theme: "glass" as const, size: "medium" as const, showHourly: true, showDetails: false },
  { name: "Clean Minimal", theme: "minimal" as const, size: "medium" as const, showHourly: false, showDetails: true },
];

export function WidgetConfigPanel({ defaultLocation }: { defaultLocation?: { lat: number; lon: number; name: string } }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [codeTab, setCodeTab] = useState("iframe");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const [config, setConfig] = useState<WidgetConfig>({
    location: defaultLocation || { lat: 0, lon: 0, name: "" },
    theme: "light",
    size: "medium",
    units: "metric",
    showHourly: true,
    showDetails: true,
    width: "320",
    height: "280",
    accentColor: "#3b82f6",
    borderRadius: 12,
    fontSize: "medium",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["widget-location-search", searchQuery],
    queryFn: () => weatherApi.searchLocations(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  // Debounced iframe refresh
  useEffect(() => {
    if (config.location.lat === 0) return;
    setIframeLoading(true);
    const t = setTimeout(() => setIframeKey((k) => k + 1), 500);
    return () => clearTimeout(t);
  }, [config]);

  const baseUrl = "https://rainz.lovable.app/widget";
  const widgetUrl = `${baseUrl}?lat=${config.location.lat}&lon=${config.location.lon}&location=${encodeURIComponent(config.location.name)}&theme=${config.theme}&size=${config.size}&units=${config.units}&hourly=${config.showHourly}&details=${config.showDetails}&accent=${encodeURIComponent(config.accentColor)}&radius=${config.borderRadius}&fontsize=${config.fontSize}`;

  const iframeCode = `<iframe\n  src="${widgetUrl}"\n  width="${config.width}"\n  height="${config.height}"\n  frameborder="0"\n  style="border-radius: ${config.borderRadius}px; overflow: hidden;"\n  title="Rainz Weather Widget"\n></iframe>`;

  const reactCode = `<iframe\n  src="${widgetUrl}"\n  width={${config.width}}\n  height={${config.height}}\n  frameBorder="0"\n  style={{ borderRadius: ${config.borderRadius}, overflow: "hidden" }}\n  title="Rainz Weather Widget"\n/>`;

  const scriptCode = `<!-- Rainz Weather Widget -->\n<div id="rainz-widget"></div>\n<script>\n  (function() {\n    var iframe = document.createElement('iframe');\n    iframe.src = '${widgetUrl}';\n    iframe.width = '${config.width}';\n    iframe.height = '${config.height}';\n    iframe.frameBorder = '0';\n    iframe.style.borderRadius = '${config.borderRadius}px';\n    iframe.style.overflow = 'hidden';\n    iframe.title = 'Rainz Weather Widget';\n    document.getElementById('rainz-widget').appendChild(iframe);\n  })();\n</script>`;

  const currentCode = codeTab === "iframe" ? iframeCode : codeTab === "react" ? reactCode : scriptCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Embed code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLocationSelect = (loc: { latitude: number; longitude: number; name: string }) => {
    setConfig((c) => ({ ...c, location: { lat: loc.latitude, lon: loc.longitude, name: loc.name } }));
    setSearchQuery("");
    setShowResults(false);
  };

  const handlePresetClick = (preset: typeof POPULAR_WIDGETS[number]) => {
    const sizePreset = SIZE_PRESETS.find((s) => s.key === preset.size)!;
    setConfig((c) => ({
      ...c,
      theme: preset.theme,
      size: preset.size,
      showHourly: preset.showHourly,
      showDetails: preset.showDetails,
      width: sizePreset.w,
      height: sizePreset.h,
    }));
  };

  const previewWidth = Math.min(PREVIEW_WIDTHS[previewDevice], parseInt(config.width));

  return (
    <div className="space-y-6">
      {/* Popular Presets */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POPULAR_WIDGETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              className="p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{preset.theme} · {preset.size}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Search */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
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
              {config.location.name && (
                <p className="text-xs text-muted-foreground">
                  Selected: {config.location.name} ({config.location.lat.toFixed(2)}, {config.location.lon.toFixed(2)})
                </p>
              )}
            </div>

            {/* Theme & Units */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={config.theme} onValueChange={(v: any) => setConfig((c) => ({ ...c, theme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <Select value={config.units} onValueChange={(v: any) => setConfig((c) => ({ ...c, units: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">°C</SelectItem>
                    <SelectItem value="imperial">°F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Size Presets */}
            <div className="space-y-2">
              <Label>Size</Label>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => setConfig((c) => ({ ...c, size: preset.key, width: preset.w, height: preset.h }))}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      config.size === preset.key ? "border-primary bg-primary/10" : "border-border/40 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-xs font-medium">{preset.label}</div>
                    <div className="text-[10px] text-muted-foreground">{preset.w}×{preset.h}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Border Radius: {config.borderRadius}px</Label>
              <Slider
                value={[config.borderRadius]}
                onValueChange={([v]) => setConfig((c) => ({ ...c, borderRadius: v }))}
                min={0} max={24} step={2}
              />
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select value={config.fontSize} onValueChange={(v: any) => setConfig((c) => ({ ...c, fontSize: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" /> Accent Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
                  className="w-10 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={config.accentColor}
                  onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <Label>Show Hourly Forecast</Label>
              <Switch checked={config.showHourly} onCheckedChange={(v) => setConfig((c) => ({ ...c, showHourly: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Details</Label>
              <Switch checked={config.showDetails} onCheckedChange={(v) => setConfig((c) => ({ ...c, showDetails: v }))} />
            </div>

            {/* Custom Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Width (px)</Label>
                <Input type="number" value={config.width} onChange={(e) => setConfig((c) => ({ ...c, width: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Height (px)</Label>
                <Input type="number" value={config.height} onChange={(e) => setConfig((c) => ({ ...c, height: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview & Code */}
        <div className="space-y-4">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Preview</span>
                <div className="flex items-center gap-1">
                  {(["mobile", "tablet", "desktop"] as const).map((device) => (
                    <Button
                      key={device}
                      variant={previewDevice === device ? "default" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPreviewDevice(device)}
                    >
                      {device === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> :
                       device === "tablet" ? <Tablet className="h-3.5 w-3.5" /> :
                       <Monitor className="h-3.5 w-3.5" />}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" asChild className="ml-1">
                    <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-xl overflow-hidden border bg-muted/30 mx-auto transition-all"
                style={{
                  width: `${Math.min(previewWidth, 500)}px`,
                  height: `${Math.min(parseInt(config.height), 400)}px`,
                }}
              >
                {config.location.lat !== 0 ? (
                  <>
                    {iframeLoading && (
                      <div className="h-full flex items-center justify-center">
                        <Skeleton className="w-full h-full" />
                      </div>
                    )}
                    <iframe
                      key={iframeKey}
                      src={widgetUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      title="Widget Preview"
                      onLoad={() => setIframeLoading(false)}
                      className={iframeLoading ? "hidden" : ""}
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Select a location to preview
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Embed Code with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embed Code</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={codeTab} onValueChange={setCodeTab}>
                <TabsList className="w-full mb-3">
                  <TabsTrigger value="iframe" className="flex-1">HTML</TabsTrigger>
                  <TabsTrigger value="react" className="flex-1">React</TabsTrigger>
                  <TabsTrigger value="script" className="flex-1">Script</TabsTrigger>
                </TabsList>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-48">
                    {currentCode}
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
              </Tabs>
              <p className="text-xs text-muted-foreground mt-3">
                Copy this code and paste it into your website's HTML.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
