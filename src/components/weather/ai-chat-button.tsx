import { useState } from "react";
import { LiquidButton } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AIWeatherCompanion } from "./ai-weather-companion";
import { WeatherSource } from "@/types/weather";
import rainzLogo from "@/assets/rainz-logo-new.png";

interface AIChatButtonProps {
  weatherData: WeatherSource;
  location: string;
  isImperial: boolean;
}

export function AIChatButton({ weatherData, location, isImperial }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <LiquidButton
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 xl:bottom-6 z-[60] h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 p-2 hover-scale"
        size="icon"
      >
        <div className="relative w-full h-full">
          <img src={rainzLogo} alt="AI weather assistant" className="w-full h-full object-contain rounded-lg" />
        </div>
      </LiquidButton>

      {/* Chat Dialog - now available to everyone */}
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
