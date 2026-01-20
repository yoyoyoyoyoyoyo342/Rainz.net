import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Key, RefreshCw, Eye, EyeOff, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function AdminApiToken() {
  const [token, setToken] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);

  const fetchToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      }
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    fetchApiKeys();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setCreatingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: { name: newKeyName.trim() }
      });

      if (error) throw error;
      
      toast.success("API key created successfully");
      setNewKeyName("");
      fetchApiKeys();
    } catch (error: any) {
      console.error("Error creating API key:", error);
      toast.error(error.message || "Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;
      
      toast.success("API key deleted");
      fetchApiKeys();
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const testApiWithKey = async (apiKey: string) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await fetch(
        "https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weather-api",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
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
        const aiStatus = data.aiEnhanced ? "with AI insights" : "raw data only";
        setTestResult(`✅ Success! ${data.metadata?.sourceCount || 0} sources, ${aiStatus}`);
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

  const testApiWithJwt = async () => {
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
        const aiStatus = data.aiEnhanced ? "with AI insights" : "raw data only";
        setTestResult(`✅ Success! ${data.metadata?.sourceCount || 0} sources, ${aiStatus}`);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Weather API Access
        </CardTitle>
        <CardDescription>
          Access the Rainz Weather API with AI-enhanced forecasts, multi-source data, and hyperlocal insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="api-keys">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api-keys">API Keys (Recommended)</TabsTrigger>
            <TabsTrigger value="jwt">Session Token</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4 mt-4">
            {/* Create New API Key */}
            <div className="space-y-2">
              <Label>Create New API Key</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="API Key Name (e.g., My App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <Button onClick={createApiKey} disabled={creatingKey}>
                  {creatingKey ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* API Keys List */}
            <div className="space-y-2">
              <Label>Your API Keys</Label>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">
                  No API keys yet. Create one above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{key.name}</span>
                          <Badge variant={key.is_active ? "default" : "secondary"} className="text-xs">
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-muted-foreground font-mono">
                            {showApiKey === key.id ? key.api_key : `${key.api_key.slice(0, 8)}...`}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          >
                            {showApiKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                        {key.last_used_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(key.api_key, key.id)}
                      >
                        {copied === key.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testApiWithKey(key.api_key)}
                        disabled={testLoading}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API Key Usage */}
            <div className="space-y-2">
              <Label>Usage with API Key</Label>
              <pre className="p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weather-api \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lat": 55.67, "lon": 12.58, "locationName": "Copenhagen"}'`}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="jwt" className="space-y-4 mt-4">
            {/* JWT Token Display */}
            <div className="space-y-2">
              <Label>Your Session Token</Label>
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
                <Button onClick={() => token && copyToClipboard(token, 'jwt')} disabled={!token} variant="outline">
                  {copied === 'jwt' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Session tokens expire. For external projects, use API keys instead.
              </p>
            </div>

            {/* JWT Test Button */}
            <Button onClick={testApiWithJwt} disabled={testLoading || !token} className="w-full">
              {testLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Test with Session Token
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Test Result */}
        {testResult && (
          <div className={`text-sm p-3 rounded ${testResult.startsWith("✅") ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
            {testResult}
          </div>
        )}

        {/* API Response Info */}
        <div className="space-y-2">
          <Label>API Response Includes</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Multi-source weather data
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> AI-enhanced forecasts (Groq)
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Hyperlocal data (AQI, pollen)
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-green-500">✓</span> Minute-by-minute precipitation
            </div>
          </div>
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
      </CardContent>
    </Card>
  );
}
