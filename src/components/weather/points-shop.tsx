import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Snowflake, Crown, Coins, ShoppingBag, Loader2, 
  ArrowRightLeft, CreditCard, Sparkles, Zap, Shield, Star, Gift
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { MysteryBoxReveal } from "./mystery-box-reveal";
import { DailySpinWheel } from "./daily-spin-wheel";
import { TipJar } from "./tip-jar";

interface MysteryBoxReward {
  type: "shop_points" | "streak_freeze" | "premium_trial" | "double_points";
  amount?: number;
  label: string;
  description: string;
}
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  type: "streak_freeze" | "rainz_plus_trial" | "double_points" | "prediction_boost" | "profile_badge";
  maxQuantity?: number;
  duration?: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "streak_freeze",
    name: "Streak Freeze",
    description: "Automatically protects your streak if you miss a day",
    price: 25,
    icon: <Snowflake className="w-5 h-5 text-blue-400" />,
    type: "streak_freeze",
    maxQuantity: 5,
  },
  {
    id: "rainz_plus_3day",
    name: "Rainz+ Trial",
    description: "Unlock all premium features for 3 days",
    price: 100,
    icon: <Crown className="w-5 h-5 text-yellow-400" />,
    type: "rainz_plus_trial",
    duration: "3 days",
  },
  {
    id: "double_points",
    name: "Double Points",
    description: "Earn 2x points on your next prediction",
    price: 50,
    icon: <Zap className="w-5 h-5 text-purple-400" />,
    type: "double_points",
    duration: "1 use",
  },
  {
    id: "prediction_boost",
    name: "Prediction Shield",
    description: "Protect against point loss on wrong predictions (3 uses)",
    price: 60,
    icon: <Shield className="w-5 h-5 text-green-400" />,
    type: "prediction_boost",
    maxQuantity: 3,
  },
  {
    id: "profile_badge_weather_master",
    name: "Weather Master Badge",
    description: "Show off your dedication with an exclusive profile badge",
    price: 150,
    icon: <Star className="w-5 h-5 text-amber-400" />,
    type: "profile_badge",
  },
  {
    id: "gift_box",
    name: "Mystery Box",
    description: "Random reward: Could be SP, streak freezes, or premium time!",
    price: 40,
    icon: <Gift className="w-5 h-5 text-pink-400" />,
    type: "prediction_boost",
  },
];

const SP_PACKAGES = [
  { id: "sp_500", points: 500, price: "€0.99", popular: false },
  { id: "sp_1200", points: 1200, price: "€1.99", popular: true },
  { id: "sp_3000", points: 3000, price: "€4.49", popular: false },
];

const CONVERSION_RATE = 10; // 10 PP = 1 SP

interface UserInventory {
  streak_freeze: number;
  prediction_boost: number;
}

interface ActivePowerup {
  type: string;
  expiresAt?: Date;
  usesRemaining?: number;
}

interface ShopOffer {
  id: string;
  item_id: string;
  original_price: number;
  offer_price: number;
  ends_at: string | null;
}

export const PointsShop = () => {
  const { user } = useAuth();
  const { isSubscribed, checkSubscription } = useSubscription();
  const [predictionPoints, setPredictionPoints] = useState(0);
  const [shopPoints, setShopPoints] = useState(0);
  const [inventory, setInventory] = useState<UserInventory>({ streak_freeze: 0, prediction_boost: 0 });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null);
  const [activeTrial, setActiveTrial] = useState<Date | null>(null);
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [usedOfferIds, setUsedOfferIds] = useState<string[]>([]);
  const [mysteryBoxOpen, setMysteryBoxOpen] = useState(false);
  const [mysteryReward, setMysteryReward] = useState<MysteryBoxReward | null>(null);
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchUsedOffers();
    }
    fetchOffers();
  }, [user]);

  const fetchOffers = async () => {
    try {
      const { data } = await supabase
        .from("shop_offers")
        .select("id, item_id, original_price, offer_price, ends_at")
        .eq("is_active", true);
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const fetchUsedOffers = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("user_offer_purchases")
        .select("offer_id")
        .eq("user_id", user.id);
      setUsedOfferIds(data?.map(d => d.offer_id) || []);
    } catch (error) {
      console.error("Error fetching used offers:", error);
    }
  };

  const getItemPrice = (itemId: string, defaultPrice: number) => {
    const offer = offers.find((o) => o.item_id === itemId);
    if (offer) {
      // Check if offer is still valid (not expired)
      if (offer.ends_at && new Date(offer.ends_at) < new Date()) {
        return { price: defaultPrice, isOnSale: false, originalPrice: defaultPrice, offerId: null };
      }
      // Check if user already used this offer
      if (usedOfferIds.includes(offer.id)) {
        return { price: defaultPrice, isOnSale: false, originalPrice: defaultPrice, offerId: null };
      }
      return { price: offer.offer_price, isOnSale: true, originalPrice: offer.original_price, offerId: offer.id };
    }
    return { price: defaultPrice, isOnSale: false, originalPrice: defaultPrice, offerId: null };
  };

  // Handle SP purchase confirmation from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spPurchase = params.get("sp_purchase");
    const points = params.get("points");
    
    if (spPurchase === "success" && points && user) {
      confirmPurchase(parseInt(points));
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const confirmPurchase = async (points: number) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      await supabase.functions.invoke("confirm-sp-purchase", {
        body: { points },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      
      toast.success(`${points} Shop Points added to your account!`);
      fetchUserData();
    } catch (error) {
      console.error("Error confirming purchase:", error);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points, shop_points")
        .eq("user_id", user.id)
        .single();

      setPredictionPoints(profile?.total_points || 0);
      setShopPoints(profile?.shop_points || 0);

      const { data: inventoryData } = await supabase
        .from("user_inventory")
        .select("item_type, quantity")
        .eq("user_id", user.id);

      const inv: UserInventory = { streak_freeze: 0, prediction_boost: 0 };
      inventoryData?.forEach((item) => {
        if (item.item_type === "streak_freeze") inv.streak_freeze = item.quantity;
        if (item.item_type === "prediction_boost") inv.prediction_boost = item.quantity;
      });
      setInventory(inv);

      const { data: trials } = await supabase
        .from("premium_trials")
        .select("expires_at")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      if (trials && trials.length > 0) {
        setActiveTrial(new Date(trials[0].expires_at));
      }

      // Fetch active powerups
      const { data: powerups } = await supabase
        .from("active_powerups")
        .select("powerup_type, expires_at, uses_remaining")
        .eq("user_id", user.id);

      const activePowerupsList: ActivePowerup[] = [];
      powerups?.forEach((p) => {
        // Check if powerup is still valid
        if (p.expires_at && new Date(p.expires_at) > new Date()) {
          activePowerupsList.push({
            type: p.powerup_type,
            expiresAt: new Date(p.expires_at),
          });
        } else if (p.uses_remaining && p.uses_remaining > 0) {
          activePowerupsList.push({
            type: p.powerup_type,
            usesRemaining: p.uses_remaining,
          });
        }
      });
      setActivePowerups(activePowerupsList);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const convertPoints = async () => {
    const ppToConvert = parseInt(convertAmount);
    if (isNaN(ppToConvert) || ppToConvert < CONVERSION_RATE) {
      toast.error(`Minimum conversion is ${CONVERSION_RATE} PP`);
      return;
    }

    if (ppToConvert > predictionPoints) {
      toast.error("Not enough prediction points!");
      return;
    }

    const spToGain = Math.floor(ppToConvert / CONVERSION_RATE);
    const actualPpUsed = spToGain * CONVERSION_RATE;

    setConverting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          total_points: predictionPoints - actualPpUsed,
          shop_points: shopPoints + spToGain,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast.success(`Converted ${actualPpUsed} PP to ${spToGain} SP!`);
      setConvertAmount("");
      fetchUserData();
    } catch (error) {
      toast.error("Failed to convert points");
    } finally {
      setConverting(false);
    }
  };

  const buyShopPoints = async (packageId: string) => {
    if (!user) {
      toast.error("Please sign in to purchase");
      return;
    }

    setBuyingPackage(packageId);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("buy-shop-points", {
        body: { packageId },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        // Use location.href for more reliable Stripe redirect (avoids popup blockers)
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Buy SP error:", error);
      toast.error(error.message || "Failed to initiate purchase");
      setBuyingPackage(null);
    }
  };

  const openMysteryBox = async (): Promise<MysteryBoxReward> => {
    // Random reward logic with more variety
    // Adjust probabilities if user already has Rainz+ (exclude premium_trial)
    const roll = Math.random();
    let reward: MysteryBoxReward;
    
    // Probability ranges (adjusted if subscribed to exclude premium_trial)
    // Base: SP 25%, Freeze 20%, Double 15%, Bonus PP 15%, Badge XP 10%, Premium 15%
    // If subscribed: SP 30%, Freeze 22%, Double 18%, Bonus PP 18%, Badge XP 12%
    
    const thresholds = isSubscribed 
      ? { sp: 0.30, freeze: 0.52, double: 0.70, bonusPP: 0.88, badgeXP: 1.0 }
      : { sp: 0.25, freeze: 0.45, double: 0.60, bonusPP: 0.75, badgeXP: 0.85, premium: 1.0 };
    
    if (roll < thresholds.sp) {
      // Shop Points (15-75)
      const amount = Math.floor(Math.random() * 61) + 15;
      reward = { type: "shop_points", amount, label: `${amount} Shop Points!`, description: "Added to your balance" };
      
      await supabase
        .from("profiles")
        .update({ shop_points: shopPoints + amount })
        .eq("user_id", user!.id);
    } else if (roll < thresholds.freeze) {
      // Streak Freeze
      reward = { type: "streak_freeze", label: "Streak Freeze!", description: "Protects your streak if you miss a day" };
      
      await supabase.from("user_inventory").upsert({
        user_id: user!.id,
        item_type: "streak_freeze",
        quantity: inventory.streak_freeze + 1,
      }, { onConflict: "user_id,item_type" });
    } else if (roll < thresholds.double) {
      // Double Points (1 use, not 24h)
      reward = { type: "double_points", label: "Double Points!", description: "2x points on your next prediction" };
      
      // Insert as uses_remaining instead of time-based
      await supabase.from("active_powerups").insert({
        user_id: user!.id,
        powerup_type: "double_points",
        uses_remaining: 1,
      });
    } else if (roll < thresholds.bonusPP) {
      // Bonus Prediction Points (25-100)
      const amount = Math.floor(Math.random() * 76) + 25;
      reward = { type: "shop_points", amount, label: `${amount} Bonus PP!`, description: "Prediction Points added" };
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("user_id", user!.id)
        .single();
      
      await supabase
        .from("profiles")
        .update({ total_points: (profile?.total_points || 0) + amount })
        .eq("user_id", user!.id);
    } else if (roll < thresholds.badgeXP) {
      // Weather Trivia XP Boost - gives 50 PP
      reward = { type: "shop_points", amount: 50, label: "XP Boost!", description: "50 bonus prediction points" };
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("user_id", user!.id)
        .single();
      
      await supabase
        .from("profiles")
        .update({ total_points: (profile?.total_points || 0) + 50 })
        .eq("user_id", user!.id);
    } else if (!isSubscribed) {
      // Premium Trial (1 day) - only for non-subscribers
      reward = { type: "premium_trial", label: "1 Day Rainz+!", description: "Premium features unlocked" };
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);
      await supabase.from("premium_trials").insert({
        user_id: user!.id,
        expires_at: expiresAt.toISOString(),
        source: "mystery_box",
      });
    } else {
      // Fallback for edge case (shouldn't happen)
      const amount = 30;
      reward = { type: "shop_points", amount, label: `${amount} Shop Points!`, description: "Added to your balance" };
      
      await supabase
        .from("profiles")
        .update({ shop_points: shopPoints + amount })
        .eq("user_id", user!.id);
    }
    
    return reward;
  };

  const purchaseItem = async (item: ShopItem) => {
    if (!user) {
      toast.error("Please sign in to make purchases");
      return;
    }

    // Get actual price (may be on sale) - check affordability with OFFER price, not original
    const { price: actualPrice, offerId } = getItemPrice(item.id, item.price);
    
    if (shopPoints < actualPrice) {
      toast.error("Not enough Shop Points!");
      return;
    }

    // For shop purchases, max is 5. Only perfect predictions can go above
    if (item.type === "streak_freeze" && inventory.streak_freeze >= 5) {
      toast.error("You can only purchase up to 5 streak freezes. Earn more through perfect predictions!");
      return;
    }

    if (item.type === "rainz_plus_trial" && (isSubscribed || activeTrial)) {
      toast.error("You already have active Rainz+!");
      return;
    }

    setPurchasing(item.id);

    try {
      // Deduct SP with actual price (already calculated above)
      await supabase
        .from("profiles")
        .update({ shop_points: shopPoints - actualPrice })
        .eq("user_id", user.id);

      // Record purchase with actual price
      await supabase.from("shop_purchases").insert({
        user_id: user.id,
        item_type: item.type,
        item_name: item.name,
        points_spent: actualPrice,
      });

      // If this was an offer purchase, record it so user can't use same offer again
      if (offerId) {
        await supabase.from("user_offer_purchases").insert({
          user_id: user.id,
          offer_id: offerId,
        });
        setUsedOfferIds(prev => [...prev, offerId]);
      }

      // Handle item logic - special case for mystery box
      if (item.id === "gift_box") {
        const reward = await openMysteryBox();
        setMysteryReward(reward);
        setMysteryBoxOpen(true);
        fetchUserData();
        return;
      }
      
      if (item.type === "streak_freeze") {
        await supabase.from("user_inventory").upsert({
          user_id: user.id,
          item_type: "streak_freeze",
          quantity: inventory.streak_freeze + 1,
        }, { onConflict: "user_id,item_type" });
        toast.success("Streak Freeze added to your inventory!");
      } else if (item.type === "rainz_plus_trial") {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);
        await supabase.from("premium_trials").insert({
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
          source: "shop",
        });
        toast.success("Rainz+ Trial activated!");
        await checkSubscription();
      } else if (item.type === "double_points") {
        // Activate double points for 1 use (next prediction)
        await supabase.from("active_powerups").insert({
          user_id: user.id,
          powerup_type: "double_points",
          uses_remaining: 1,
        });
        toast.success("Double Points activated! 2x on your next prediction 🚀");
      } else if (item.type === "prediction_boost") {
        // Add prediction shield with 3 uses
        await supabase.from("active_powerups").insert({
          user_id: user.id,
          powerup_type: "prediction_shield",
          uses_remaining: 3,
        });
        toast.success("Prediction Shield activated! (3 uses)");
      } else {
        toast.success(`${item.name} purchased!`);
      }

      fetchUserData();
    } catch (error) {
      toast.error("Failed to complete purchase");
    } finally {
      setPurchasing(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Sign in to access the Shop</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const spFromConversion = convertAmount ? Math.floor(parseInt(convertAmount) / CONVERSION_RATE) || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Daily Spin Wheel */}
      <DailySpinWheel />

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Prediction Points</span>
            </div>
            <p className="text-2xl font-bold">{predictionPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">PP</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Shop Points</span>
            </div>
            <p className="text-2xl font-bold">{shopPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">SP</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Quick View */}
      {(inventory.streak_freeze > 0 || activeTrial || activePowerups.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {inventory.streak_freeze > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Snowflake className="w-3 h-3" />
              {inventory.streak_freeze} Freeze{inventory.streak_freeze !== 1 ? "s" : ""}
            </Badge>
          )}
          {activeTrial && (
            <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
              <Crown className="w-3 h-3" />
              Trial until {activeTrial.toLocaleDateString()}
            </Badge>
          )}
          {activePowerups.map((powerup, idx) => (
            <Badge key={idx} className={`gap-1 ${powerup.type === 'double_points' ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' : 'bg-green-500/20 text-green-600 border-green-500/30'}`}>
              {powerup.type === 'double_points' ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {powerup.type === 'double_points' 
                ? (powerup.usesRemaining ? `2x Points (${powerup.usesRemaining} use${powerup.usesRemaining > 1 ? 's' : ''})` : powerup.expiresAt ? `2x Points (${Math.ceil((powerup.expiresAt.getTime() - Date.now()) / 3600000)}h left)` : '2x Points')
                : `Shield (${powerup.usesRemaining} uses)`}
            </Badge>
          ))}
        </div>
      )}

      {/* Points Converter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Convert PP to SP
          </CardTitle>
          <CardDescription className="text-xs">
            Convert your Prediction Points to Shop Points ({CONVERSION_RATE} PP = 1 SP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={`Min ${CONVERSION_RATE} PP`}
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              className="flex-1"
            />
            <Button onClick={convertPoints} disabled={converting || !convertAmount}>
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert"}
            </Button>
          </div>
          {spFromConversion > 0 && (
            <p className="text-sm text-muted-foreground">
              You'll get <span className="font-bold text-amber-500">{spFromConversion} SP</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Buy SP with Money */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Buy Shop Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {SP_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => buyShopPoints(pkg.id)}
                disabled={buyingPackage === pkg.id}
                className={`relative p-3 rounded-lg border-2 transition-all text-center ${
                  pkg.popular 
                    ? "border-primary bg-primary/5 hover:bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                } disabled:opacity-50`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5">
                    Popular
                  </Badge>
                )}
                {buyingPackage === pkg.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <>
                    <p className="text-lg font-bold">{pkg.points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">SP</p>
                    <p className="text-sm font-medium text-primary mt-1">{pkg.price}</p>
                  </>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tip Jar */}
      <TipJar />

      <Separator />

      {/* Shop Items */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Shop Items
        </h3>
        <div className="grid gap-3">
          {SHOP_ITEMS.map((item) => {
            const { price: currentPrice, isOnSale, originalPrice } = getItemPrice(item.id, item.price);
            const canAfford = shopPoints >= currentPrice;
            const atMax = item.type === "streak_freeze" && inventory.streak_freeze >= 5;
            const hasActive = item.type === "rainz_plus_trial" && (isSubscribed || !!activeTrial);
            const isDisabled = !canAfford || atMax || hasActive;

            return (
              <Card key={item.id} className={`transition-all ${isOnSale ? "border-green-500/50 bg-green-500/5" : ""} ${isDisabled ? "opacity-60" : "hover:border-primary/50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted rounded-lg shrink-0 relative">
                      {item.icon}
                      {isOnSale && (
                        <Badge className="absolute -top-2 -right-2 text-[9px] px-1 py-0 bg-green-500">
                          SALE
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        {item.duration && (
                          <Badge variant="outline" className="text-[10px]">{item.duration}</Badge>
                        )}
                        {item.type === "streak_freeze" && (
                          <Badge variant="outline" className="text-[10px]">
                            {inventory.streak_freeze} owned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        {isOnSale && (
                          <span className="text-xs text-muted-foreground line-through">{originalPrice}</span>
                        )}
                        <span className={`text-sm font-bold ${isOnSale ? "text-green-500" : "text-amber-500"}`}>
                          <Sparkles className="w-3 h-3 inline mr-0.5" />
                          {currentPrice}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isDisabled ? "outline" : "default"}
                        disabled={isDisabled || purchasing === item.id}
                        onClick={() => purchaseItem(item)}
                        className="h-7 text-xs px-3"
                      >
                        {purchasing === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : atMax ? (
                          "Max (Shop)"
                        ) : hasActive ? (
                          "Active"
                        ) : !canAfford ? (
                          "Need SP"
                        ) : (
                          "Buy"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Snowflake className="w-3 h-3" /> Streak Freezes are automatic
          </p>
          <p>• If you miss a day, a freeze protects your streak</p>
          <p>• Max 5 from the shop, but you can earn more through perfect predictions!</p>
          <p>• Get all 3 predictions correct = +300 pts + Free Streak Freeze</p>
        </CardContent>
      </Card>

      {/* Mystery Box Reveal */}
      <MysteryBoxReveal 
        isOpen={mysteryBoxOpen} 
        onClose={() => {
          setMysteryBoxOpen(false);
          setMysteryReward(null);
          setPurchasing(null);
        }} 
        reward={mysteryReward} 
      />
    </div>
  );
};
