import { Crown, Check, Sparkles, Bot, Zap, Ban, Sun, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "AI Weather Companion",
    description: "Chat with PAI for personalized weather insights and recommendations"
  },
  {
    icon: Zap,
    title: "AI Enhanced Forecasts",
    description: "Access experimental AI-processed weather data"
  },
  {
    icon: Sun,
    title: "Morning AI Review",
    description: "Get personalized morning weather briefings"
  },
  {
    icon: Settings,
    title: "Advanced Settings",
    description: "Full customization options"
  }
];

export function SubscriptionCard() {
  // All features are now free for everyone
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          Rainz
          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Free</span>
        </CardTitle>
        <CardDescription className="text-lg">
          All features are now <span className="font-bold text-foreground">free</span> for everyone!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <Sparkles className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-green-700 dark:text-green-400">
            Enjoy all features at no cost!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
