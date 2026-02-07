import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Copy, Check, Twitter, MessageCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import rainzLogo from "@/assets/rainz-logo-new.png";

interface PredictionShareProps {
  prediction: {
    high: string;
    low: string;
    condition: string;
    location: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const getConditionEmoji = (condition: string): string => {
  const c = condition.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "☀️";
  if (c.includes("partly")) return "⛅";
  if (c.includes("cloudy") || c.includes("overcast")) return "☁️";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return "🌧️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("thunder") || c.includes("storm")) return "⛈️";
  if (c.includes("fog")) return "🌫️";
  if (c.includes("wind")) return "💨";
  return "🌤️";
};

const getGradientByCondition = (condition: string): string => {
  const c = condition.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "from-amber-500 via-orange-400 to-yellow-400";
  if (c.includes("partly")) return "from-blue-400 via-sky-300 to-amber-300";
  if (c.includes("cloudy") || c.includes("overcast")) return "from-slate-500 via-gray-400 to-slate-300";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return "from-slate-600 via-blue-500 to-slate-400";
  if (c.includes("snow")) return "from-slate-300 via-blue-200 to-white";
  if (c.includes("thunder") || c.includes("storm")) return "from-slate-800 via-purple-600 to-slate-600";
  if (c.includes("fog")) return "from-gray-400 via-slate-300 to-gray-200";
  return "from-blue-500 via-sky-400 to-cyan-400";
};

export const PredictionShare = ({ prediction, isOpen, onClose }: PredictionShareProps) => {
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync external isOpen prop with internal state using useEffect
  useEffect(() => {
    if (isOpen) {
      setIsDialogOpen(true);
      setImageUrl(null); // Reset image when opening
    }
  }, [isOpen]);

  // Generate image when dialog opens
  useEffect(() => {
    if (isDialogOpen && cardRef.current && !imageUrl) {
      const generateImage = async () => {
        setIsGenerating(true);
        try {
          // Small delay to ensure card is fully rendered
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (cardRef.current) {
            const dataUrl = await toPng(cardRef.current, {
              quality: 1,
              pixelRatio: 2,
              backgroundColor: 'transparent',
            });
            setImageUrl(dataUrl);
          }
        } catch (err) {
          console.error("Error generating image:", err);
          toast.error("Failed to generate share image");
        } finally {
          setIsGenerating(false);
        }
      };
      generateImage();
    }
  }, [isDialogOpen, prediction]);

  const handleClose = () => {
    setIsDialogOpen(false);
    onClose();
  };

  const shareText = `🌤️ My prediction on Rainz was...

📍 ${prediction.location}
🌡️ High: ${prediction.high}° / Low: ${prediction.low}°
☁️ Condition: ${prediction.condition}

You can also make your prediction at Rainz.net!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement("a");
    link.download = `rainz-prediction-${prediction.location.replace(/[^a-z0-9]/gi, '-')}.png`;
    link.href = imageUrl;
    link.click();
    toast.success("Image downloaded!");
  };

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${waText}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share && imageUrl) {
      try {
        // Try to share with image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "rainz-prediction.png", { type: "image/png" });
        
        await navigator.share({
          title: "My Weather Prediction on Rainz",
          text: shareText,
          files: [file],
        });
      } catch {
        // Fallback to text only
        try {
          await navigator.share({
            title: "My Weather Prediction on Rainz",
            text: shareText,
          });
        } catch {
          // User cancelled or error
        }
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: "My Weather Prediction on Rainz",
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  const gradient = getGradientByCondition(prediction.condition);
  const emoji = getConditionEmoji(prediction.condition);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Prediction
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Shareable Card Preview */}
          <div className="relative">
            {/* Hidden card for image generation */}
            <div 
              ref={cardRef}
              className={`w-[400px] h-[240px] rounded-2xl bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between absolute -left-[9999px]`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={rainzLogo} alt="Rainz" className="w-8 h-8 rounded-lg" />
                  <span className="text-white font-bold text-lg drop-shadow-md">Rainz</span>
                </div>
                <span className="text-white/80 text-sm font-medium drop-shadow-md">My Prediction</span>
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-2">{emoji}</div>
                  <div className="text-white font-bold text-2xl drop-shadow-lg mb-1">{prediction.condition}</div>
                  <div className="text-white/90 text-lg font-medium drop-shadow-md">
                    {prediction.high}° / {prediction.low}°
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="text-white font-medium drop-shadow-md">
                  📍 {prediction.location.length > 25 ? prediction.location.substring(0, 25) + '...' : prediction.location}
                </div>
                <div className="text-white/70 text-sm drop-shadow-md">rainz.net</div>
              </div>
            </div>

            {/* Visible preview */}
            <div className="relative rounded-xl overflow-hidden border border-border/30 bg-muted/30">
              {isGenerating ? (
                <div className="flex items-center justify-center h-[180px]">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Prediction card preview" 
                  className="w-full h-auto"
                />
              ) : (
                <div className={`w-full aspect-[5/3] rounded-xl bg-gradient-to-br ${gradient} p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={rainzLogo} alt="Rainz" className="w-6 h-6 rounded-md" />
                      <span className="text-white font-bold drop-shadow-md">Rainz</span>
                    </div>
                    <span className="text-white/80 text-xs font-medium drop-shadow-md">My Prediction</span>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">{emoji}</div>
                    <div className="text-white font-bold text-lg drop-shadow-lg">{prediction.condition}</div>
                    <div className="text-white/90 text-sm font-medium drop-shadow-md">
                      {prediction.high}° / {prediction.low}°
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-white font-medium drop-shadow-md truncate max-w-[60%]">
                      📍 {prediction.location}
                    </div>
                    <div className="text-white/70 drop-shadow-md">rainz.net</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            {imageUrl && (
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
            
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Text"}
            </Button>
            
            {navigator.share && (
              <Button onClick={handleNativeShare} className="gap-2 col-span-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}
            
            <Button 
              onClick={handleTwitterShare} 
              variant="outline" 
              className="gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border-[#1DA1F2]/30"
            >
              <Twitter className="w-4 h-4" />
              Twitter/X
            </Button>
            
            <Button 
              onClick={handleWhatsAppShare} 
              variant="outline" 
              className="gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
