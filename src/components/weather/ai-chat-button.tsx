import { useState } from "react";
import { LiquidButton } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AIWeatherCompanion } from "./ai-weather-companion";
import { WeatherSource } from "@/types/weather";
import rainzLogo from "@/assets/rainz-logo-new.png";
import { useAppPlatform } from "@/hooks/use-app-platform";
import { useToast } from "@/hooks/use-toast";
import { Smartphone } from "lucide-react";

interface AIChatButtonProps {
  weatherData: WeatherSource;
  location: string;
  isImperial: boolean;
}

export function AIChatButton({ weatherData, location, isImperial }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAppUser } = useAppPlatform();
  const { toast } = useToast();

  const handleClick = () => {
    if (!isAppUser) {
      toast({
        title: "📱 App-Exclusive Feature",
        description: "Install the Rainz app (PWA or desktop) to use the AI Weather Companion.",
        action: (
          <a href="/download" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
            Download
          </a>
        ),
        duration: 6000,
      });
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <LiquidButton
        onClick={handleClick}
        className="fixed bottom-20 right-6 xl:bottom-6 z-[60] h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 p-2 hover-scale glass-circle"
        size="icon"
      >
        <div className="relative w-full h-full">
          <img src={rainzLogo} alt="AI weather assistant" className="w-full h-full object-contain rounded-lg" />
          {!isAppUser && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-muted rounded-full flex items-center justify-center border-2 border-background">
              <Smartphone className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </LiquidButton>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] lg:w-[80vw] h-[85vh] flex flex-col p-0 gap-0">
          <AIWeatherCompanion 
            weatherData={weatherData}
            location={location}
            isImperial={isImperial}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
