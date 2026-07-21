import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ArrowLeft, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/seo-head";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";

export default function PredictPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Predictions — Rejn Weather"
        description="Predictions are being reworked. Check back soon for the new Rejn prediction game."
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-24">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-5 pt-10 pb-10 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Target className="w-10 h-10 text-primary" aria-hidden />
              </div>
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-amber-600" aria-hidden />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Predictions is having a redo
              </h1>
              <p className="text-sm text-muted-foreground">
                Check back again soon.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to weather
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomTabBar />
    </>
  );
}
