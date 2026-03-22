import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Cloud, Zap, Shield, Globe, Terminal, Code, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/seo/seo-head";

const MCP_URL = "https://pjatisrbiggxzinalosy.supabase.co/functions/v1/rainz-mcp";

function CopyBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/60 border border-border rounded-lg p-4 overflow-x-auto text-sm font-mono text-foreground">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

const tools = [
  {
    name: "get_current_weather",
    description: "Current conditions: temperature, humidity, wind, UV, pressure, and more",
    icon: Cloud,
  },
  {
    name: "get_hourly_forecast",
    description: "Hour-by-hour forecast for up to 24 hours ahead",
    icon: Zap,
  },
  {
    name: "get_daily_forecast",
    description: "7-day daily forecast with high/low temps and conditions",
    icon: Globe,
  },
  {
    name: "get_air_quality",
    description: "Air quality index (AQI) and pollen levels",
    icon: Shield,
  },
  {
    name: "get_weather_alerts",
    description: "Active severe weather alerts: storms, floods, heat warnings",
    icon: Layers,
  },
];

const claudeConfig = `{
  "mcpServers": {
    "rainz-weather": {
      "url": "${MCP_URL}"
    }
  }
}`;

const cursorConfig = `{
  "mcpServers": {
    "rainz-weather": {
      "url": "${MCP_URL}",
      "transport": "streamable-http"
    }
  }
}`;

const pythonExample = `import httpx

MCP_URL = "${MCP_URL}"

# Call the get_current_weather tool
response = httpx.post(MCP_URL, json={
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "get_current_weather",
        "arguments": {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "location_name": "London, UK"
        }
    }
})

print(response.json())`;

const typescriptExample = `const MCP_URL = "${MCP_URL}";

const response = await fetch(MCP_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_current_weather",
      arguments: {
        latitude: 51.5074,
        longitude: -0.1278,
        location_name: "London, UK",
      },
    },
  }),
});

const data = await response.json();
console.log(data);`;

export default function MCP() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Rainz MCP — Weather Data for AI Apps"
        description="Add real-time weather data to your AI applications with the Rainz MCP server. Compatible with Claude, Cursor, Windsurf, and any MCP client."
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Rainz
        </Link>

        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">MCP Server</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Rainz MCP
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Add real-time, multi-model weather intelligence to any AI application. 
            Free, no API key required, works with any MCP-compatible client.
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Quick Start — 30 seconds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Copy the server URL below and paste it into your MCP client configuration:
            </p>
            <CopyBlock code={MCP_URL} />
            <p className="text-sm text-muted-foreground">
              That's it! No API key, no signup, no rate limits for personal use.
            </p>
          </CardContent>
        </Card>

        {/* Client Configurations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Client Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="claude">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="cursor">Cursor</TabsTrigger>
                <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="claude" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add to your Claude Desktop <code className="bg-muted px-1 rounded">claude_desktop_config.json</code>:
                </p>
                <CopyBlock code={claudeConfig} />
              </TabsContent>

              <TabsContent value="cursor" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add to your Cursor MCP settings (<code className="bg-muted px-1 rounded">.cursor/mcp.json</code>):
                </p>
                <CopyBlock code={cursorConfig} />
              </TabsContent>

              <TabsContent value="typescript" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Call the MCP server directly via JSON-RPC:
                </p>
                <CopyBlock code={typescriptExample} language="typescript" />
              </TabsContent>

              <TabsContent value="python" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use any HTTP client to call Rainz MCP:
                </p>
                <CopyBlock code={pythonExample} language="python" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Available Tools */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {tools.map((tool) => (
                <div key={tool.name} className="flex items-start gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <code className="text-sm font-semibold text-foreground">{tool.name}</code>
                    <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Powered by Multi-Model Ensemble</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Unlike single-source weather APIs, Rainz aggregates data from multiple weather models and picks the most accurate one:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["ECMWF", "GFS (NOAA)", "Met.no", "WeatherAPI", "Open-Meteo", "Tomorrow.io"].map((src) => (
                <div key={src} className="text-center p-3 rounded-lg bg-muted/40 border border-border text-sm font-medium text-foreground">
                  {src}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Is this free?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! The MCP server is free for personal and development use. For high-volume commercial use, please contact us.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Do I need an API key?</h4>
              <p className="text-sm text-muted-foreground">
                No. The MCP server is open and requires no authentication for standard usage.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">What units are returned?</h4>
              <p className="text-sm text-muted-foreground">
                All temperatures are in Celsius (°C), wind speed in km/h, and pressure in hPa.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Which MCP clients are supported?</h4>
              <p className="text-sm text-muted-foreground">
                Any client that supports the MCP Streamable HTTP transport — Claude Desktop, Cursor, Windsurf, Lovable, Cline, and more.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
