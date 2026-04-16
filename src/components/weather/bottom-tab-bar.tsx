import { CloudSun, Target, Bell, Compass } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const tabs = [
  { id: "home", path: "/", label: "Home", icon: CloudSun },
  { id: "predict", path: "/predict", label: "Predict", icon: Target },
  { id: "social", path: "/social", label: "Social", icon: Bell },
  { id: "explore", path: "/explore", label: "Explore", icon: Compass },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notification-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const activeTab = tabs.find((t) => t.path === location.pathname)?.id || "home";

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2">
        <div className="rounded-2xl border border-border/40 mx-2 mb-2 shadow-lg"
          style={{
            background: 'hsl(var(--card) / 0.85)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          <div className="grid grid-cols-4 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.path === location.pathname) {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      navigate(tab.path);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 relative ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    {tab.id === "social" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-card" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>
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
      {/* Spacer */}
      <div className="h-24" />
    </>
  );
}
