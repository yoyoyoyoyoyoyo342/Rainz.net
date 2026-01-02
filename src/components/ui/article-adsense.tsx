import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const AD_CLIENT = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "";
const AD_SLOT = import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID || "";

interface ArticleAdProps {
  className?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle" | "fluid";
}

export function ArticleAd({ className = "", format = "fluid" }: ArticleAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const adId = useRef(`ad-${Math.random().toString(36).substring(7)}`);
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

    const checkAndPush = () => {
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
    };

    // Small delay to ensure DOM is ready
    setTimeout(checkAndPush, 100);
  }, []);

  if (!AD_CLIENT || !AD_SLOT) {
    return null;
  }

  return (
    <div className={`article-ad my-6 ${className}`}>
      <div className="text-xs text-muted-foreground text-center mb-2">Advertisement</div>
      <div ref={adRef} id={adId.current} className="flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format={format}
          data-ad-layout={format === "fluid" ? "in-article" : undefined}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}

export function ArticleTopAd({ className = "" }: { className?: string }) {
  return (
    <div className={`border-b border-border pb-4 mb-6 ${className}`}>
      <ArticleAd format="horizontal" />
    </div>
  );
}

export function ArticleBottomAd({ className = "" }: { className?: string }) {
  return (
    <div className={`border-t border-border pt-6 mt-8 ${className}`}>
      <ArticleAd format="rectangle" />
      <div className="text-center mt-4">
        <Link
          to="/subscription"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Sparkles className="h-4 w-4" />
          <span>Upgrade to Rainz+ for an ad-free experience</span>
        </Link>
      </div>
    </div>
  );
}
