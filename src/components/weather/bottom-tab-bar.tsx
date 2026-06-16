import { CloudSun, Trophy, Compass } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { toast } from "sonner";

type Tab = {
  id: string;
  path: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  mascot?: boolean;
  requiresAuth?: boolean;
};

const tabs: Tab[] = [
  { id: "home", path: "/", label: "Home", icon: CloudSun },
  { id: "predict", path: "/predict", label: "Games & Social", icon: Trophy, requiresAuth: true },
  { id: "ai", path: "/ai", label: "Ask Rejn", mascot: true, requiresAuth: true },
  { id: "explore", path: "/explore", label: "Explore", icon: Compass },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activeTab = tabs.find((t) => t.path === location.pathname)?.id || "home";

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

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2">
        <div className="rounded-2xl border border-border/40 mx-2 mb-2 shadow-lg bg-card">
          <div className="grid grid-cols-4 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
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
