import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIP_AMOUNTS = [
  { amount: 100, label: "€1", emoji: "☕" },
  { amount: 300, label: "€3", emoji: "🍕" },
  { amount: 500, label: "€5", emoji: "🌟" },
];

const GOAL_CENTS = 2500; // €25 goal

export const TipJar = () => {
  const { user } = useAuth();
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tipping, setTipping] = useState<number | null>(null);
  const [recentTippers, setRecentTippers] = useState<string[]>([]);

  useEffect(() => {
    fetchTipData();
    checkTipSuccess();
  }, []);

  const fetchTipData = async () => {
    try {
      // Get total raised - ONLY count completed tips
      const { data: tips } = await supabase
        .from("tip_jar")
        .select("amount_cents, user_id")
        .eq("status", "completed");

      const total = tips?.reduce((sum, tip) => sum + tip.amount_cents, 0) || 0;
      setTotalRaised(total);

      // Get recent tippers (last 5 unique users who tipped)
      const userIds = [...new Set(tips?.filter(t => t.user_id).map(t => t.user_id))].slice(0, 5);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("display_name")
          .in("user_id", userIds);
        
        setRecentTippers(profiles?.map(p => p.display_name || "Anonymous").filter(Boolean) || []);
      }
    } catch (error) {
      console.error("Error fetching tip data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkTipSuccess = async () => {
    const params = new URLSearchParams(window.location.search);
    const tipResult = params.get("tip");
    const sessionId = params.get("session_id");
    
    if (tipResult === "success" && sessionId) {
      // Clean URL immediately
      window.history.replaceState({}, "", window.location.pathname);
      
      try {
        // Verify the payment with Stripe and confirm the tip
        const { data, error } = await supabase.functions.invoke("confirm-tip", {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.confirmed) {
          const amountEuros = ((data.amount_cents || 0) / 100).toFixed(2);
          toast.success(`Thank you for your €${amountEuros} tip! ❤️`);
          // Refresh tip data to show the new total
          await fetchTipData();
        } else {
          console.log("Tip not confirmed:", data?.message);
        }
      } catch (error) {
        console.error("Error confirming tip:", error);
      }
    }
  };

  const handleTip = async (amountCents: number) => {
    setTipping(amountCents);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("create-tip-checkout", {
        body: { amountCents },
        headers: session?.session ? { 
          Authorization: `Bearer ${session.session.access_token}` 
        } : undefined,
      });

      if (error) throw error;
      
      if (data?.url) {
        // Use location.href for more reliable Stripe redirect (avoids popup blockers)
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Error creating tip checkout:", error);
      toast.error("Failed to process tip. Please try again.");
      setTipping(null);
    }
  };

  const progressPercent = Math.min((totalRaised / GOAL_CENTS) * 100, 100);
  const goalReached = totalRaised >= GOAL_CENTS;

  return (
    <Card className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 border-rose-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          Support Rainz
          {goalReached && (
            <Badge className="ml-auto bg-green-500/20 text-green-600 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Goal Reached!
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Help keep Rainz free and ad-light
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              €{(totalRaised / 100).toFixed(2)} raised
            </span>
            <span className="text-muted-foreground">
              Goal: €{(GOAL_CENTS / 100).toFixed(0)}
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        {/* Tip buttons */}
        <div className="grid grid-cols-3 gap-2">
          {TIP_AMOUNTS.map((tip) => (
            <Button
              key={tip.amount}
              variant="outline"
              size="sm"
              onClick={() => handleTip(tip.amount)}
              disabled={tipping !== null}
              className="flex flex-col h-auto py-3 hover:bg-rose-500/10 hover:border-rose-500/50"
            >
              {tipping === tip.amount ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-lg">{tip.emoji}</span>
                  <span className="font-bold">{tip.label}</span>
                </>
              )}
            </Button>
          ))}
        </div>

        {/* Recent tippers */}
        {recentTippers.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <Heart className="w-3 h-3 inline mr-1 text-rose-500" />
              Recent supporters: {recentTippers.slice(0, 3).join(", ")}
              {recentTippers.length > 3 && ` +${recentTippers.length - 3} more`}
            </p>
          </div>
        )}

        {/* Thank you message if goal reached */}
        {goalReached && (
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-600">
              🎉 Thank you all for your support!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We reached our monthly goal
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
