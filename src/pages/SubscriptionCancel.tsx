import { useNavigate } from "react-router-dom";
import { Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md text-center border-2 border-green-500/20 bg-gradient-to-br from-background to-green-500/5">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Great News!
          </CardTitle>
          <CardDescription className="text-lg">
            All features are now completely free
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Rainz is now free for everyone. Enjoy all features including AI companion, enhanced forecasts, and more!
          </p>

          <Button 
            onClick={() => navigate("/")} 
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Weather
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
