import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Cloud, CloudRain, Snowflake, Wind, Zap, Loader2, CheckCircle, ExternalLink, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Seasonal pricing - prices increase during peak weather seasons in Scandinavia
function getCurrentSeason(): "winter" | "spring" | "summer" | "autumn" {
  const month = new Date().getMonth(); // 0-11
  if (month >= 11 || month <= 1) return "winter"; // Dec-Feb
  if (month >= 2 && month <= 4) return "spring";   // Mar-May
  if (month >= 5 && month <= 7) return "summer";   // Jun-Aug
  return "autumn"; // Sep-Nov
}

function getSeasonalMultiplier(condition: string): number {
  const season = getCurrentSeason();
  const multipliers: Record<string, Record<string, number>> = {
    rain:   { winter: 1.0, spring: 1.2, summer: 0.8, autumn: 1.5 },
    cloudy: { winter: 1.3, spring: 1.0, summer: 0.7, autumn: 1.2 },
    snow:   { winter: 2.0, spring: 0.8, summer: 0.3, autumn: 0.5 },
    wind:   { winter: 1.5, spring: 1.2, summer: 0.8, autumn: 1.3 },
    storm:  { winter: 1.0, spring: 1.0, summer: 1.5, autumn: 1.2 },
    sunny:  { winter: 0.5, spring: 1.0, summer: 2.0, autumn: 0.8 },
  };
  return multipliers[condition]?.[season] ?? 1.0;
}

function getSeasonalPrice(basePrice: number, condition: string): number {
  return Math.round(basePrice * getSeasonalMultiplier(condition));
}

const BASE_PRICES = { rain: 8, cloudy: 10, snow: 5, wind: 6, storm: 5, sunny: 12 };

function getAffiliatePricing() {
  return {
    rain:   { price: `€${getSeasonalPrice(BASE_PRICES.rain, "rain")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
    cloudy: { price: `€${getSeasonalPrice(BASE_PRICES.cloudy, "cloudy")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
    snow:   { price: `€${getSeasonalPrice(BASE_PRICES.snow, "snow")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
    wind:   { price: `€${getSeasonalPrice(BASE_PRICES.wind, "wind")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
    storm:  { price: `€${getSeasonalPrice(BASE_PRICES.storm, "storm")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
    sunny:  { price: `€${getSeasonalPrice(BASE_PRICES.sunny, "sunny")}`, priceId: "price_1Sh0n18mRhH1c6KOhmxF97O8" },
  };
}

const AFFILIATE_PRICING = getAffiliatePricing();

const affiliateSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(100, "Business name is too long"),
  contactEmail: z.string().trim().email("Invalid email address").max(255, "Email is too long"),
  websiteUrl: z.string().trim().url("Invalid URL - must start with https://").refine((url) => url.startsWith("https://"), "URL must use HTTPS"),
  description: z.string().trim().max(500, "Description is too long").optional(),
  weatherCondition: z.enum(["rain", "cloudy", "snow", "wind", "storm", "sunny"], { required_error: "Please select a weather condition" }),
});

const season = getCurrentSeason();
const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

const weatherConditions = [
  { value: "sunny", label: "When it's Sunny", icon: Sun, description: `${seasonLabel} pricing — your link shows during clear/sunny weather`, price: `${AFFILIATE_PRICING.sunny.price}/mo` },
  { value: "cloudy", label: "When it's Cloudy", icon: Cloud, description: `${seasonLabel} pricing — your link shows during cloudy weather`, price: `${AFFILIATE_PRICING.cloudy.price}/mo` },
  { value: "rain", label: "When it's Raining", icon: CloudRain, description: `${seasonLabel} pricing — your link shows when rain is detected`, price: `${AFFILIATE_PRICING.rain.price}/mo` },
  { value: "wind", label: "When it's Windy", icon: Wind, description: `${seasonLabel} pricing — your link shows during high winds`, price: `${AFFILIATE_PRICING.wind.price}/mo` },
  { value: "storm", label: "During Storms", icon: Zap, description: `${seasonLabel} pricing — your link shows during thunderstorms`, price: `${AFFILIATE_PRICING.storm.price}/mo` },
  { value: "snow", label: "When it's Snowing", icon: Snowflake, description: `${seasonLabel} pricing — your link shows during snowfall`, price: `${AFFILIATE_PRICING.snow.price}/mo` },
];

export default function Affiliate() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    businessName: "",
    contactEmail: user?.email || "",
    websiteUrl: "",
    description: "",
    weatherCondition: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!user || !session?.access_token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to apply for an affiliate spot.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate form
    const result = affiliateSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      // Create affiliate application - payment only after approval
      const { error: appError } = await supabase
        .from("affiliate_applications")
        .insert({
          user_id: user.id,
          business_name: result.data.businessName,
          contact_email: result.data.contactEmail,
          website_url: result.data.websiteUrl,
          description: result.data.description || null,
          weather_condition: result.data.weatherCondition,
          status: "pending",
        });

      if (appError) throw appError;

      setSubmitted(true);
      toast({
        title: "Application submitted!",
        description: "We'll review your application and contact you about payment once approved.",
      });
    } catch (error) {
      console.error("Affiliate application error:", error);
      toast({
        title: "Application failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              We'll review your application and get back to you within 24-48 hours.
            </p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Return to Rainz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Become a Rainz Affiliate</h1>
          <p className="text-muted-foreground">
            Advertise your business to Rainz users when specific weather conditions are active.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Pricing by Weather Condition</h2>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Pricing varies based on how often the condition occurs. Rarer conditions = lower price.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weatherConditions.map((condition) => (
              <Card key={condition.value} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <condition.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">{condition.label}</p>
                  <p className="text-lg font-bold text-primary">{condition.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits Card */}
        <Card className="mb-8 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Submit your application for free — no payment until approved
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                We review and approve within 24-48 hours
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Once approved, you'll receive a payment link via email
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Your link goes live when your weather condition is active
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Cancel anytime with no commitment
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Apply for an Affiliate Spot</CardTitle>
            <CardDescription>
              Fill out the form below and proceed to payment. Your spot will be activated once approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className={errors.businessName ? "border-destructive" : ""}
                />
                {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className={errors.contactEmail ? "border-destructive" : ""}
                />
                {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL *</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className={errors.websiteUrl ? "border-destructive" : ""}
                />
                {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl}</p>}
                <p className="text-xs text-muted-foreground">This is where users will be directed when they click your link</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your business and why it's relevant to weather..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={errors.description ? "border-destructive" : ""}
                  rows={3}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label>When should your link appear? *</Label>
                <Select
                  value={formData.weatherCondition}
                  onValueChange={(value) => setFormData({ ...formData, weatherCondition: value })}
                >
                  <SelectTrigger className={errors.weatherCondition ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a weather condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {weatherConditions.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        <div className="flex items-center gap-2">
                          <condition.icon className="w-4 h-4" />
                          <span>{condition.label}</span>
                          <span className="text-muted-foreground ml-auto">({condition.price})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.weatherCondition && <p className="text-xs text-destructive">{errors.weatherCondition}</p>}
                {formData.weatherCondition && (
                  <p className="text-xs text-muted-foreground">
                    {weatherConditions.find((c) => c.value === formData.weatherCondition)?.description}
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  By submitting this application, you agree to our{" "}
                  <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/affiliate-policy")}>
                    Affiliate Policy
                  </Button>
                  {" "}and{" "}
                  <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/terms")}>
                    Terms of Service
                  </Button>
                  .
                </p>

                {!user ? (
                  <Button type="button" className="w-full" onClick={() => navigate("/auth")}>
                    Sign In to Apply
                  </Button>
                ) : (
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application (Free)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
