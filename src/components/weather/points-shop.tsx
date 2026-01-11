import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Snowflake, Crown, Coins, ShoppingBag, Package, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
  type: "streak_freeze" | "rainz_plus_trial";
  maxQuantity?: number;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "streak_freeze",
    name: "Streak Freeze",
    description: "Automatically protects your streak if you miss a day. Max 5 can be held.",
    price: 200,
    icon: <Snowflake className="w-6 h-6 text-blue-400" />,
    type: "streak_freeze",
    maxQuantity: 5,
  },
  {
    id: "rainz_plus_3day",
    name: "Rainz+ Trial (3 Days)",
    description: "Unlock all premium features for 3 days including ad-free experience and exclusive cards.",
    price: 1000,
    icon: <Crown className="w-6 h-6 text-yellow-400" />,
    type: "rainz_plus_trial",
  },
];

interface UserInventory {
  streak_freeze: number;
}

interface PurchaseHistory {
  id: string;
  item_name: string;
  points_spent: number;
  purchased_at: string;
}

export const PointsShop = () => {
  const { user } = useAuth();
  const { isSubscribed, checkSubscription } = useSubscription();
  const [userPoints, setUserPoints] = useState(0);
  const [inventory, setInventory] = useState<UserInventory>({ streak_freeze: 0 });
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeTrial, setActiveTrial] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch user points
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("user_id", user.id)
        .single();

      setUserPoints(profile?.total_points || 0);

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from("user_inventory")
        .select("item_type, quantity")
        .eq("user_id", user.id);

      const inv: UserInventory = { streak_freeze: 0 };
      inventoryData?.forEach((item) => {
        if (item.item_type === "streak_freeze") {
          inv.streak_freeze = item.quantity;
        }
      });
      setInventory(inv);

      // Fetch purchase history (last 10)
      const { data: purchases } = await supabase
        .from("shop_purchases")
        .select("id, item_name, points_spent, purchased_at")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false })
        .limit(10);

      setPurchaseHistory(purchases || []);

      // Check for active trial
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

  const purchaseItem = async (item: ShopItem) => {
    if (!user) {
      toast.error("Please sign in to make purchases");
      return;
    }

    if (userPoints < item.price) {
      toast.error("Not enough points!");
      return;
    }

    // Check max quantity for streak freezes
    if (item.type === "streak_freeze" && item.maxQuantity) {
      if (inventory.streak_freeze >= item.maxQuantity) {
        toast.error(`You can only hold ${item.maxQuantity} streak freezes at a time`);
        return;
      }
    }

    // Check if already subscribed for Rainz+ trial
    if (item.type === "rainz_plus_trial" && isSubscribed) {
      toast.error("You already have an active Rainz+ subscription!");
      return;
    }

    // Check if already has active trial
    if (item.type === "rainz_plus_trial" && activeTrial) {
      toast.error(`You already have a trial active until ${activeTrial.toLocaleDateString()}`);
      return;
    }

    setPurchasing(item.id);

    try {
      // Deduct points
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({ total_points: userPoints - item.price })
        .eq("user_id", user.id);

      if (pointsError) throw pointsError;

      // Record purchase
      const { error: purchaseError } = await supabase
        .from("shop_purchases")
        .insert({
          user_id: user.id,
          item_type: item.type,
          item_name: item.name,
          points_spent: item.price,
        });

      if (purchaseError) throw purchaseError;

      // Handle item-specific logic
      if (item.type === "streak_freeze") {
        // Upsert inventory
        const { error: invError } = await supabase
          .from("user_inventory")
          .upsert({
            user_id: user.id,
            item_type: "streak_freeze",
            quantity: inventory.streak_freeze + 1,
          }, { onConflict: "user_id,item_type" });

        if (invError) throw invError;

        toast.success("Streak Freeze purchased! It will automatically protect your streak if you miss a day.");
      } else if (item.type === "rainz_plus_trial") {
        // Create trial
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);

        const { error: trialError } = await supabase
          .from("premium_trials")
          .insert({
            user_id: user.id,
            expires_at: expiresAt.toISOString(),
            source: "shop",
          });

        if (trialError) throw trialError;

        toast.success("Rainz+ Trial activated! Enjoy 3 days of premium features!");
        
        // Refresh subscription status
        await checkSubscription();
      }

      // Refresh data
      await fetchUserData();
    } catch (error) {
      console.error("Error purchasing item:", error);
      toast.error("Failed to complete purchase. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please sign in to access the Points Shop</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points Balance */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold">{userPoints.toLocaleString()} points</p>
              </div>
            </div>
            {inventory.streak_freeze > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Snowflake className="w-3 h-3" />
                {inventory.streak_freeze} freeze{inventory.streak_freeze !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeTrial && (
            <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Rainz+ Trial active until {activeTrial.toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shop Items */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Available Items
        </h3>
        <div className="grid gap-4">
          {SHOP_ITEMS.map((item) => {
            const canAfford = userPoints >= item.price;
            const atMaxQuantity = item.type === "streak_freeze" && item.maxQuantity !== undefined && inventory.streak_freeze >= item.maxQuantity;
            const hasActiveSub = item.type === "rainz_plus_trial" && (isSubscribed || !!activeTrial);
            const isDisabled = !canAfford || !!atMaxQuantity || !!hasActiveSub;

            return (
              <Card key={item.id} className={`transition-all ${isDisabled ? "opacity-60" : "hover:border-primary/50"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {item.name}
                          {item.maxQuantity && (
                            <Badge variant="outline" className="text-xs">
                              {inventory.streak_freeze}/{item.maxQuantity}
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        {item.type === "streak_freeze" && (
                          <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Automatically used when you miss a day
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-lg font-bold mb-2">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        {item.price}
                      </div>
                      <Button
                        size="sm"
                        disabled={isDisabled || purchasing === item.id}
                        onClick={() => purchaseItem(item)}
                      >
                        {purchasing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : atMaxQuantity ? (
                          "Max Owned"
                        ) : hasActiveSub ? (
                          "Active"
                        ) : !canAfford ? (
                          "Need More Points"
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

      {/* How Streak Freezes Work */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-400" />
            How Streak Freezes Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Streak freezes are <strong>automatic</strong> – no action needed from you!</p>
          <p>• If you miss a day, a freeze is used to keep your streak intact</p>
          <p>• You can hold up to 5 streak freezes at a time</p>
          <p>• Your streak count stays the same as your last active day</p>
        </CardContent>
      </Card>

      {/* Purchase History */}
      {purchaseHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recent Purchases
          </h3>
          <div className="space-y-2">
            {purchaseHistory.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg"
              >
                <span>{purchase.item_name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    -{purchase.points_spent} pts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(purchase.purchased_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};