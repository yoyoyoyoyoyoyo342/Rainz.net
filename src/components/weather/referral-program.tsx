import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Gift, Copy, Check, Share2, Trophy } from "lucide-react";
import { useReferral } from "@/hooks/use-referral";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function ReferralProgram() {
  const { user } = useAuth();
  const { referralCode, referralLink, referralStats, shareReferralLink } = useReferral();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Refer Friends, Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in to get your referral link and earn 50 points for every friend who joins!
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await shareReferralLink();
    toast({ title: "Shared!", description: "Referral link shared" });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Refer Friends, Earn Points
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Share your unique link — you and your friend each earn <strong>50 points</strong>!
        </p>

        {/* Referral Link */}
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralLink}
            className="text-xs font-mono bg-muted/50"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{referralStats.totalReferred}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{referralStats.pointsEarned}</p>
              <p className="text-xs text-muted-foreground">Points Earned</p>
            </div>
          </div>
        </div>

        {referralCode && (
          <p className="text-xs text-center text-muted-foreground">
            Your code: <span className="font-mono font-bold">{referralCode}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
