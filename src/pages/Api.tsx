import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Zap, Globe, Brain, Shield, Key, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function Api() {
  const { user } = useAuth();
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }

    // Check for subscription success
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast.success('API subscription activated! You can now generate an API key.');
      window.history.replaceState({}, '', '/api');
    }
  }, [user]);

  async function loadApiKeys() {
    setLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoadingKeys(false);
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  async function handleSubscribe() {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-api-subscription');
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start subscription');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleGenerateKey() {
    if (!user) {
      toast.error('Please sign in to generate an API key');
      return;
    }

    setGeneratingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: { name: 'API Key ' + (apiKeys.length + 1) }
      });
      
      if (error) throw error;
      
      toast.success('API key generated successfully!');
      copyToClipboard(data.api_key, 'new-key');
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate API key');
    } finally {
      setGeneratingKey(false);
    }
  }

  const endpoint = "https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/llm-weather-forecast";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Weather API</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Rainz Weather API
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access LLM-enhanced weather forecasts with multi-model aggregation and intelligent analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Brain className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle className="text-lg">AI-Enhanced</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              LLM analyzes data from multiple weather models for unified predictions
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Globe className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle className="text-lg">Multi-Source</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              Aggregates ECMWF, GFS, DWD ICON, Met.no, and more
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Zap className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle className="text-lg">Fast & Reliable</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              Fallback to raw data if AI is unavailable for 100% uptime
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl">Pay As You Go</CardTitle>
                <CardDescription>Only pay for what you use</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">€0.01</div>
                <div className="text-sm text-muted-foreground">per API call</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="py-1">
                <Shield className="h-3 w-3 mr-1" /> Secure API Key
              </Badge>
              <Badge variant="outline" className="py-1">No monthly minimum</Badge>
              <Badge variant="outline" className="py-1">
                <CreditCard className="h-3 w-3 mr-1" /> Metered billing
              </Badge>
              <Badge variant="outline" className="py-1">Volume discounts available</Badge>
            </div>
            {user ? (
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleSubscribe} disabled={subscribing}>
                  {subscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleGenerateKey} disabled={generatingKey}>
                  {generatingKey ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generate API Key
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pt-2">
                Sign in to get started with the API
              </p>
            )}
          </CardContent>
        </Card>

        {user && apiKeys.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Your API Keys
              </CardTitle>
              <CardDescription>Manage your API keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{key.name}</div>
                      <code className="text-sm text-muted-foreground">
                        {key.api_key.substring(0, 12)}...
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(key.api_key, key.id)}
                      >
                        {copiedEndpoint === key.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>API Endpoint</CardTitle>
            <CardDescription>POST request to get LLM-enhanced weather data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
              <span className="text-primary font-semibold">POST</span>
              <code className="flex-1">{endpoint}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(endpoint, "endpoint")}
              >
                {copiedEndpoint === "endpoint" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="request" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Body</CardTitle>
                <CardDescription>Send weather source data for LLM analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`{
  "location": "New York, NY",
  "sources": [
    {
      "source": "WeatherAPI",
      "currentWeather": {
        "temperature": 72,
        "condition": "Partly Cloudy",
        "humidity": 65,
        "windSpeed": 8,
        "feelsLike": 74,
        "pressure": 1015
      },
      "hourlyForecast": [...],
      "dailyForecast": [...]
    }
  ]
}`}</pre>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="response">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response</CardTitle>
                <CardDescription>LLM-enhanced unified forecast with confidence levels</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`{
  "current": {
    "temperature": 72,
    "feelsLike": 74,
    "condition": "Partly Cloudy",
    "description": "Mild conditions with some cloud cover",
    "humidity": 65,
    "windSpeed": 8,
    "pressure": 1015,
    "confidence": 92
  },
  "hourly": [...],
  "daily": [...],
  "summary": "Pleasant day with increasing clouds...",
  "modelAgreement": 87,
  "insights": [
    "High pressure system maintaining stable conditions",
    "Slight chance of evening showers"
  ]
}`}</pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Contact us for support or volume pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              For API support, volume pricing, or enterprise plans, please contact us at:
            </p>
            <a 
              href="mailto:api@rainz.net" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              api@rainz.net
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}