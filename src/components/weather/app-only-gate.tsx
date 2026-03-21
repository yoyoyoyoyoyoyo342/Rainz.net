import { useAppPlatform } from "@/hooks/use-app-platform";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

interface AppOnlyGateProps {
  children: React.ReactNode;
  featureName: string;
}

/**
 * Wraps a feature so it's only available to PWA / desktop app users.
 * Shows an install prompt for browser users.
 */
export function AppOnlyGate({ children, featureName }: AppOnlyGateProps) {
  const { isAppUser } = useAppPlatform();

  if (isAppUser) return <>{children}</>;

  return (
    <div className="relative rounded-2xl border border-border/40 overflow-hidden">
      <div className="pointer-events-none opacity-30 blur-[2px] select-none grayscale">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="text-center space-y-3 p-6 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {featureName} is app-exclusive
          </h3>
          <p className="text-sm text-muted-foreground">
            Install the Rainz app to unlock {featureName} and other exclusive features.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/download">
              <Button size="sm" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download Desktop App
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              Or install from your browser: Menu → "Add to Home Screen"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
