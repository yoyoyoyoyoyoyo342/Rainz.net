import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Snowflake, Crown, Coins, ShoppingBag, Package, Loader2, CheckCircle, 
  ArrowRightLeft, CreditCard, Sparkles, Zap, Shield, Star, Gift
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";

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
    price: 150,
    icon: <Snowflake className="w-5 h-5 text-blue-400" />,
    type: "streak_freeze",
    maxQuantity: 5,
  },
  {
    id: "rainz_plus_3day",
    name: "Rainz+ Trial",
    description: "Unlock all premium features for 3 days",
    price: 800,
    icon: <Crown className="w-5 h-5 text-yellow-400" />,
    type: "rainz_plus_trial",
    duration: "3 days",
  },
  {
    id: "double_points",
    name: "Double Points",
    description: "Earn 2x prediction points for 24 hours",
    price: 300,
    icon: <Zap className="w-5 h-5 text-purple-400" />,
    type: "double_points",
    duration: "24 hours",
  },
  {
    id: "prediction_boost",
    name: "Prediction Shield",
    description: "Protect against point loss on wrong predictions (3 uses)",
    price: 400,
    icon: <Shield className="w-5 h-5 text-green-400" />,
    type: "prediction_boost",
    maxQuantity: 3,
  },
  {
    id: "profile_badge_weather_master",
    name: "Weather Master Badge",
    description: "Show off your dedication with an exclusive profile badge",
    price: 1000,
    icon: <Star className="w-5 h-5 text-amber-400" />,
    type: "profile_badge",
  },
  {
    id: "gift_box",
    name: "Mystery Box",
    description: "Random reward: Could be SP, streak freezes, or premium time!",
    price: 250,
    icon: <Gift className="w-5 h-5 text-pink-400" />,
    type: "prediction_boost",
  },
];

const SP_PACKAGES = [
  { id: "sp_500", points: 500, price: "$1.99", popular: false },
  { id: "sp_1200", points: 1200, price: "$3.99", popular: true },
  { id: "sp_3000", points: 3000, price: "$7.99", popular: false },
];

const CONVERSION_RATE = 10; // 10 PP = 1 SP

interface UserInventory {
  streak_freeze: number;
  prediction_boost: number;
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

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

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
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate purchase");
    } finally {
      setBuyingPackage(null);
    }
  };

  const purchaseItem = async (item: ShopItem) => {
    if (!user) {
      toast.error("Please sign in to make purchases");
      return;
    }

    if (shopPoints < item.price) {
      toast.error("Not enough Shop Points!");
      return;
    }

    if (item.type === "streak_freeze" && item.maxQuantity && inventory.streak_freeze >= item.maxQuantity) {
      toast.error(`You can only hold ${item.maxQuantity} streak freezes`);
      return;
    }

    if (item.type === "rainz_plus_trial" && (isSubscribed || activeTrial)) {
      toast.error("You already have active Rainz+!");
      return;
    }

    setPurchasing(item.id);

    try {
      // Deduct SP
      await supabase
        .from("profiles")
        .update({ shop_points: shopPoints - item.price })
        .eq("user_id", user.id);

      // Record purchase
      await supabase.from("shop_purchases").insert({
        user_id: user.id,
        item_type: item.type,
        item_name: item.name,
        points_spent: item.price,
      });

      // Handle item logic
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
      {(inventory.streak_freeze > 0 || activeTrial) && (
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

      <Separator />

      {/* Shop Items */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Shop Items
        </h3>
        <div className="grid gap-3">
          {SHOP_ITEMS.map((item) => {
            const canAfford = shopPoints >= item.price;
            const atMax = item.type === "streak_freeze" && item.maxQuantity && inventory.streak_freeze >= item.maxQuantity;
            const hasActive = item.type === "rainz_plus_trial" && (isSubscribed || !!activeTrial);
            const isDisabled = !canAfford || atMax || hasActive;

            return (
              <Card key={item.id} className={`transition-all ${isDisabled ? "opacity-60" : "hover:border-primary/50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted rounded-lg shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        {item.duration && (
                          <Badge variant="outline" className="text-[10px]">{item.duration}</Badge>
                        )}
                        {item.maxQuantity && item.type === "streak_freeze" && (
                          <Badge variant="outline" className="text-[10px]">
                            {inventory.streak_freeze}/{item.maxQuantity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                        <Sparkles className="w-3 h-3" />
                        {item.price}
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
                          "Max"
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
          <p>• Max 5 freezes at a time</p>
        </CardContent>
      </Card>
    </div>
  );
};
