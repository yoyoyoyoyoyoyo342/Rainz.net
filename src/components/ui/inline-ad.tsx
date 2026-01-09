import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { usePremiumSettings } from "@/hooks/use-premium-settings";

const AD_CLIENT = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "";
const AD_SLOT = import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID || "";

interface InlineAdProps {
  className?: string;
}

/**
 * Non-intrusive inline ad component that follows AdSense policies:
 * - Clearly labeled as "Sponsored"
 * - Placed in natural content flow (not in nav/footer/sticky)
 * - Proper spacing from interactive elements
 * - Not placed near buttons or misleading content
 * - Hidden for premium users
 */
export function InlineAd({ className = "" }: InlineAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const { isSubscribed } = usePremiumSettings();

  useEffect(() => {
    // Don't show ads to premium users
    if (isSubscribed) return;
    if (initialized.current || !AD_CLIENT || !AD_SLOT) return;
    initialized.current = true;

    // Load AdSense script if not already present
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    // Push the ad after script loads
    const pushAd = () => {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    };

    // Wait for script to load
    if ((window as any).adsbygoogle) {
      pushAd();
    } else {
      const checkScript = setInterval(() => {
        if ((window as any).adsbygoogle) {
          clearInterval(checkScript);
          pushAd();
        }
      }, 100);
      setTimeout(() => clearInterval(checkScript), 5000);
    }
  }, [isSubscribed]);

  // Don't render for premium users or if no credentials
  if (isSubscribed || !AD_CLIENT || !AD_SLOT) {
    return null;
  }

  return (
    <div className={`inline-ad-container my-6 ${className}`}>
      {/* Clear "Sponsored" label as required by AdSense */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Sponsored</span>
        <Link
          to="/articles/what-is-rainz"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          <span>Go ad-free</span>
        </Link>
      </div>
      
      {/* Ad container with proper styling */}
      <div 
        ref={adRef} 
        className="rounded-lg border border-border/50 bg-muted/30 p-3 overflow-hidden"
        aria-label="Advertisement"
      >
        <ins
          className="adsbygoogle"
          style={{ 
            display: "block",
            textAlign: "center",
            minHeight: "100px"
          }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format="fluid"
          data-ad-layout-key="-6t+ed+2i-1n-4w"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
