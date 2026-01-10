import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Key, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminApiToken() {
  const [token, setToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchToken = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      } else {
        toast.error("No active session found");
      }
    } catch (error) {
      console.error("Error fetching token:", error);
      toast.error("Failed to get auth token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy token");
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session?.access_token) {
        setToken(session.access_token);
        toast.success("Token refreshed");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error("Failed to refresh token");
    } finally {
      setLoading(false);
    }
  };

  const testApi = async () => {
    if (!token) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await fetch(
        "https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weather-api",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: 55.67,
            lon: 12.58,
            locationName: "Copenhagen Test",
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setTestResult(`✅ Success! Received ${data.sourceCount} weather sources`);
        toast.success("API test successful!");
      } else {
        setTestResult(`❌ Error: ${data.error}`);
        toast.error(`API Error: ${data.error}`);
      }
    } catch (error: any) {
      setTestResult(`❌ Network Error: ${error.message}`);
      toast.error("Failed to call API");
    } finally {
      setTestLoading(false);
    }
  };

  const curlExample = token
    ? `curl -X POST https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weather-api \\
  -H "Authorization: Bearer ${token.slice(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"lat": 55.67, "lon": 12.58, "locationName": "Copenhagen"}'`
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Weather API Access
        </CardTitle>
        <CardDescription>
          Your session token for accessing the admin-only Weather API. This token expires and refreshes with your login session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Display */}
        <div className="space-y-2">
          <Label>Your Auth Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={token || "Loading..."}
                readOnly
                className="pr-10 font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={copyToken} disabled={!token} variant="outline">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button onClick={refreshToken} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This token is tied to your session and will expire. Refresh if needed.
          </p>
        </div>

        {/* API Endpoint */}
        <div className="space-y-2">
          <Label>API Endpoint</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs overflow-x-auto">
              POST https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weather-api
            </code>
            <Badge variant="secondary">Admin Only</Badge>
          </div>
        </div>

        {/* Request Body */}
        <div className="space-y-2">
          <Label>Request Body (JSON)</Label>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`{
  "lat": 55.67,          // Required: Latitude
  "lon": 12.58,          // Required: Longitude
  "locationName": "Copenhagen"  // Optional: Location name
}`}
          </pre>
        </div>

        {/* Response Info */}
        <div className="space-y-2">
          <Label>Response Includes</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Multi-source weather data
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> AI-enhanced forecasts
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Hyperlocal data (AQI, pollen)
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Minute-by-minute precipitation
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={testApi} disabled={testLoading || !token} className="flex-1">
              {testLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Test API (Copenhagen)
                </>
              )}
            </Button>
          </div>
          {testResult && (
            <p className={`text-sm p-2 rounded ${testResult.startsWith("✅") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
              {testResult}
            </p>
          )}
        </div>

        {/* cURL Example */}
        <div className="space-y-2">
          <Label>cURL Example</Label>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
            {curlExample || "Loading..."}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
