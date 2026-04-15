import { useState } from "react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReferralProgram } from "@/components/weather/referral-program";

export function Footer() {
  const { getValue } = useFeatureFlags();
  const version = getValue('app_version', '1.2.82');
  const [referralOpen, setReferralOpen] = useState(false);

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
            <Link to="/dryroutes" className="hover:text-foreground transition-colors">
              DryRoutes
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
            <Link to="/airport" className="hover:text-foreground transition-colors">
              Landing page
            </Link>
            <button onClick={() => setReferralOpen(true)} className="hover:text-foreground transition-colors text-primary font-medium">
              Refer a Friend 🎁
            </button>
            <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
              <DialogContent className="max-w-md">
                <ReferralProgram />
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-center md:text-right space-y-3">
            <a href="https://www.producthunt.com/products/rainz-weather?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-rainz-weather" target="_blank" rel="noopener noreferrer">
              <img alt="Rainz Weather - Weather but smarter. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1063846&theme=light&t=1776278577169" />
            </a>
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
