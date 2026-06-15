import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { brandName } from "@/lib/birthday-mode";

export function Footer() {
  const { getValue } = useFeatureFlags();
  const version = getValue("app_version", "2.0.0");

  return (
    <footer className="w-full border-t border-border bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/articles" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/download" className="hover:text-foreground transition-colors">
              Download
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/data-settings" className="hover:text-foreground transition-colors">
              Data & Privacy Settings
            </Link>
          </div>
          <div className="text-center md:text-right space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-3">
              <a
                href="https://www.producthunt.com/products/rainz-weather?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-rainz-weather"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  alt="Rejn on Product Hunt"
                  width="250"
                  height="54"
                  loading="lazy"
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1063846&theme=light&t=1776278577169"
                />
              </a>
              <a
                href="https://peerpush.net/p/rainz-weather"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://peerpush.net/p/rainz-weather/badge.png"
                  alt="Rejn on PeerPush"
                  style={{ width: 230 }}
                />
              </a>
            </div>
            <p>© 2025-{new Date().getFullYear()} <a href="https://localilabs.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Locali Labs</a>. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/70">{brandName()} · v{version}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
