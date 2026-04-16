import { CloudSun, Target, Bell, Compass } from "lucide-react";

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasUnreadNotifications?: boolean;
}

const tabs = [
  { id: "home", label: "Home", icon: CloudSun },
  { id: "predict", label: "Predict", icon: Target },
  { id: "social", label: "Social", icon: Bell },
  { id: "explore", label: "Explore", icon: Compass },
];

export function BottomTabBar({ activeTab, onTabChange, hasUnreadNotifications }: BottomTabBarProps) {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2">
        <div className="glass-card glass-tab-bar rounded-2xl border border-border/30 backdrop-blur-xl mx-2 mb-2 shadow-lg">
          <div className="grid grid-cols-4 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 relative ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    {tab.id === "social" && hasUnreadNotifications && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
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
