import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Copy, Check, Twitter, MessageCircle } from "lucide-react";
import { toast } from "sonner";

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

export const PredictionShare = ({ prediction, isOpen, onClose }: PredictionShareProps) => {
  const [copied, setCopied] = useState(false);

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

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${waText}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Prediction
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap font-mono">
            {shareText}
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Text"}
            </Button>
            
            {navigator.share && (
              <Button onClick={handleNativeShare} className="gap-2">
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
