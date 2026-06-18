import { CloudSun, Trophy, Compass } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type Tab = {
  id: string;
  path: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  mascot?: boolean;
  requiresAuth?: boolean;
};

const baseTabs: Tab[] = [
  { id: "home", path: "/", label: "Home", icon: CloudSun },
  { id: "predict", path: "/predict", label: "Games", icon: Trophy, requiresAuth: true },
  { id: "ai", path: "/ai", label: "Ask Rejn", mascot: true, requiresAuth: true },
  { id: "explore", path: "/explore", label: "Explore", icon: Compass },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
            className="glass-card glass-tab-bar pointer-events-auto mx-auto max-w-md mb-3 overflow-hidden rounded-[28px] border border-border/30 bg-card/70 shadow-lg"
          >
            <div className="grid grid-cols-4 p-1.5">
              {baseTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const tone = isActive ? "text-primary" : "text-muted-foreground";
                return (
                  <button
                    data-no-glass
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[22px] bg-transparent py-1.5 transition-all active:scale-95 ${
                      isActive ? "bg-primary/12 shadow-inner" : "hover:bg-muted/20"
                    }`}
                  >
                    <div
                      className="relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all"
                    >
                      {tab.mascot ? (
                        <RejnMascot
                          pose={isActive ? "wave" : "sit"}
                          className={`h-7 w-7 ${isActive ? "" : "opacity-60"}`}
                        />
                      ) : (
                        Icon && <Icon className={`h-[22px] w-[22px] transition-colors ${tone}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold leading-none transition-colors ${tone}`}>
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
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 relative bg-transparent ${
                    isActive ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
                  }`}
                >
                  <div className="relative h-6 flex items-center justify-center">
                    {tab.mascot ? (
                      <RejnMascot
                        pose={isActive ? "wave" : "sit"}
                        className={`h-7 w-7 -mt-1 ${isActive ? "" : "opacity-80"}`}
                      />
                    ) : (
                      Icon && <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
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
