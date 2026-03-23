import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

export function Footer() {
  const { getValue } = useFeatureFlags();
  const version = getValue('app_version', '1.2.82');

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
            <Link to="/mcp" className="hover:text-foreground transition-colors">
              MCP
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors text-primary font-medium">
              Refer a Friend 🎁
            </Link>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p>© 2025-{new Date().getFullYear()} Rainz. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/70">V{version}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground/70">
            Disclaimer: Rainz is not affiliated with, endorsed by, or connected to Rains A/S or any of its subsidiaries
            or affiliates. "Rains" is a registered trademark of Rains A/S.
          </p>
        </div>
      </div>
    </footer>
  );
}
