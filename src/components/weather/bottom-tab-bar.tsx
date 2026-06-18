import { CloudSun, Trophy, Compass } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { toast } from "sonner";
import { useUnreadNotificationsCount } from "@/hooks/use-unread-notifications";
import { useIsMobile } from "@/hooks/use-mobile";

type Tab = {
  id: string;
  path: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  mascot?: boolean;
  requiresAuth?: boolean;
  showDot?: boolean;
};

const baseTabs: Tab[] = [
  { id: "home", path: "/", label: "Home", icon: CloudSun },
  { id: "predict", path: "/predict", label: "Games", icon: Trophy, requiresAuth: true, showDot: true },
  { id: "ai", path: "/ai", label: "Ask Rejn", mascot: true, requiresAuth: true },
  { id: "explore", path: "/explore", label: "Explore", icon: Compass },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const unread = useUnreadNotificationsCount();
  const isMobile = useIsMobile();

  const activeTab = baseTabs.find((t) => t.path === location.pathname)?.id || "home";

  const handleTabClick = (tab: Tab) => {
    if (tab.requiresAuth && !user) {
      toast("Sign in to continue", { description: `${tab.label} requires an account.` });
      navigate(`/auth?next=${encodeURIComponent(tab.path)}`);
      return;
    }
    if (tab.path === location.pathname) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(tab.path);
    }
  };

  if (isMobile) {
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-3 pointer-events-none">
          <div
            className="pointer-events-auto mx-auto max-w-md mb-3 rounded-[28px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl bg-background/70 dark:bg-background/60"
            style={{ WebkitBackdropFilter: "blur(20px) saturate(180%)" }}
          >
            <div className="grid grid-cols-4 px-2 py-2">
              {baseTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const dot = tab.showDot && unread > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    className="relative flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all active:scale-90"
                  >
                    <div
                      className={`relative h-10 w-12 flex items-center justify-center rounded-2xl transition-all ${
                        isActive ? "bg-primary/15" : ""
                      }`}
                    >
                      {tab.mascot ? (
                        <RejnMascot
                          pose={isActive ? "wave" : "sit"}
                          className={`h-7 w-7 ${isActive ? "" : "opacity-70"}`}
                        />
                      ) : (
                        Icon && (
                          <Icon
                            className={`h-[22px] w-[22px] transition-colors ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                        )
                      )}
                      {dot && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold leading-none transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground/70"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
        <div className="h-24" />
      </>
    );
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2">
        <div className="rounded-2xl border border-border/40 mx-2 mb-2 shadow-lg bg-card">
          <div className="grid grid-cols-4 py-2">
            {baseTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const dot = tab.showDot && unread > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 relative bg-transparent ${
                    isActive ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
                  }`}
                  style={{ background: "transparent" }}
                >
                  <div className="relative h-6 flex items-center justify-center">
                    {tab.mascot ? (
                      <RejnMascot
                        pose={isActive ? "wave" : "sit"}
                        className={`h-7 w-7 -mt-1 ${isActive ? "" : "opacity-80"}`}
                      />
                    ) : (
                      Icon && <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    )}
                    {dot && (
                      <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-primary" : ""}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
      <div className="h-24" />
    </>
  );
}
