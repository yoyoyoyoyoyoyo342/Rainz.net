import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  message: string;
  background_color: string;
  text_color: string;
}

const DISMISSED_KEY = "dismissed_app_banners";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  const s = getDismissed();
  s.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
}

export function AppBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("app_banners")
        .select("id,title,message,background_color,text_color")
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .gte("ends_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const dismissed = getDismissed();
      const first = (data || []).find((b: Banner) => !dismissed.has(b.id));
      setBanner(first || null);
    }
    load();
    const ch = (supabase as any)
      .channel("app-banners")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_banners" },
        () => load()
      )
      .subscribe();
    return () => {
      cancelled = true;
      (supabase as any).removeChannel(ch);
    };
  }, []);

  if (!banner) return null;

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm shadow-sm relative z-[100]"
      style={{ backgroundColor: banner.background_color, color: banner.text_color }}
      role="status"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{banner.title}</div>
        {banner.message && (
          <div className="text-xs opacity-90 truncate">{banner.message}</div>
        )}
      </div>
      <button
        aria-label="Dismiss banner"
        onClick={() => {
          dismiss(banner.id);
          setBanner(null);
        }}
        className="shrink-0 rounded-full p-1 hover:bg-black/10 transition-colors"
        style={{ color: banner.text_color }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
