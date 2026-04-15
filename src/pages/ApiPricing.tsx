import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Copy, Key, Loader2, Trash2, Eye, EyeOff, Zap, Crown, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/seo-head";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "/month",
    dailyLimit: 100,
    icon: Zap,
    features: [
      "100 API calls/day",
      "Current weather data",
      "AI-enhanced forecasts",
      "Basic support",
    ],
    cta: "Get Free Key",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "€9",
    period: "/month",
    dailyLimit: 10000,
    icon: Crown,
    features: [
      "10,000 API calls/day",
      "Current + hourly forecasts",
      "AI weather descriptions",
      "Ensemble model data",
      "Priority support",
    ],
    cta: "Start Pro",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "€49",
    period: "/month",
    dailyLimit: -1,
    icon: Building2,
    features: [
      "Unlimited API calls",
      "All weather endpoints",
      "AI insights + MCP access",
      "White-label responses",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Start Business",
    popular: false,
  },
];

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function ApiPricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [keyName, setKeyName] = useState("Default");

  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      toast({ title: "Subscription activated! 🎉", description: "Your API tier has been upgraded." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    fetchApiKeys();
    fetchSubscription();
  }, [user]);

  const fetchApiKeys = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (data) setApiKeys(data);
  };

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from("api_subscriptions" as any)
      .select("tier")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setCurrentTier((data as any).tier || "free");
  };

  const generateApiKey = async () => {
    if (!session) {
      toast({ title: "Please sign in", description: "You need an account to generate API keys.", variant: "destructive" });
      return;
    }
    setGeneratingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { name: keyName },
      });
      if (error) throw error;
      toast({ title: "API Key Generated! 🔑", description: "Your new key is ready to use." });
      setKeyName("Default");
      fetchApiKeys();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingKey(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    toast({ title: "Key deactivated" });
    fetchApiKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied to clipboard" });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const subscribeTier = async (tierId: string) => {
    if (!session) {
      toast({ title: "Please sign in first", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (tierId === "free") {
      await supabase.from("api_subscriptions" as any).upsert({
        user_id: user!.id,
        tier: "free",
        daily_limit: 100,
      } as any, { onConflict: "user_id" });
      setCurrentTier("free");
      if (apiKeys.length === 0) await generateApiKey();
      toast({ title: "Free tier activated!" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-api-subscription", {
        body: { tier: tierId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Rainz Weather API — Pricing & Developer Access"
        description="Access real-time AI-enhanced weather data for Scandinavia. Free tier available. Pro and Business plans for developers and businesses."
        canonicalUrl="https://rainz.net/api"
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Rainz Weather API</h1>
              <p className="text-muted-foreground">AI-enhanced weather data for developers</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrent = currentTier === tier.id && user;
              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${tier.popular ? "border-primary shadow-lg scale-[1.02]" : "border-border"}`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3 w-fit">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                      <span className="text-muted-foreground">{tier.period}</span>
                    </div>
                    <CardDescription>
                      {tier.dailyLimit === -1 ? "Unlimited calls" : `${tier.dailyLimit.toLocaleString()} calls/day`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      disabled={!!isCurrent || loading}
                      onClick={() => subscribeTier(tier.id)}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {isCurrent ? "Current Plan" : tier.cta}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
              <CardDescription>Make your first API call in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-foreground">
{`curl "https://rainz.net/api/weather?lat=55.68&lon=12.57" \\
  -H "x-api-key: YOUR_API_KEY"`}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Returns AI-enhanced weather data including temperature, conditions, umbrella score, and natural language description.
              </p>
            </CardContent>
          </Card>

          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Your API Keys
                </CardTitle>
                <CardDescription>
                  Manage your API keys. Current tier: <Badge variant="secondary">{currentTier.toUpperCase()}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Key name"
                    className="max-w-xs"
                  />
                  <Button onClick={generateApiKey} disabled={generatingKey}>
                    {generatingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                    Generate Key
                  </Button>
                </div>

                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No API keys yet. Generate one above to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{key.name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">
                            {visibleKeys.has(key.id) ? key.api_key : key.api_key.substring(0, 7) + "•".repeat(20)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(key.id)}>
                          {visibleKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyKey(key.api_key)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!user && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Sign in to generate API keys and manage your subscription</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
