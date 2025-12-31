import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

// AdSense credentials from environment
const AD_CLIENT = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "";
const AD_SLOT = import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID || "";

interface GoogleAdProps {
  className?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
}

export function GoogleAd({ className = "", format = "auto" }: GoogleAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
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
      // Clear after 5 seconds to prevent infinite loop
      setTimeout(() => clearInterval(checkScript), 5000);
    }
  }, []);

  // Don't render if no credentials
  if (!AD_CLIENT || !AD_SLOT) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div ref={adRef} className="google-ad-container flex justify-center" aria-label="Advertisement">
        <ins
          className="adsbygoogle"
          style={{ display: "block", minWidth: "300px", minHeight: "90px" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
      <Link
        to="/articles/what-is-rainz"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span>Upgrade to Rainz+ to remove ads</span>
      </Link>
    </div>
  );
}

// Keep CarbonAd as fallback/alternative
export function CarbonAd({ className = "" }: { className?: string }) {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || !adRef.current) return;

    const existingScript = document.getElementById("_carbonads_js");
    if (existingScript) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.id = "_carbonads_js";
    script.async = true;
    script.src = "//cdn.carbonads.com/carbon.js?serve=PLACEHOLDER&placement=PLACEHOLDER";

    adRef.current.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      const carbonAds = document.getElementById("carbonads");
      if (carbonAds) carbonAds.remove();
    };
  }, []);

  return (
    <div ref={adRef} className={`carbon-ad-container flex justify-center ${className}`} aria-label="Advertisement" />
  );
}
