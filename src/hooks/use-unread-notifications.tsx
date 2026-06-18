import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

const DISMISSED_MESSAGES_KEY = "dismissed_broadcast_messages";
const READ_MESSAGES_KEY = "read_broadcast_messages";

function getSet(key: string): Set<string> {
  try {
    const s = localStorage.getItem(key);
    return s ? new Set(JSON.parse(s)) : new Set();
  } catch {
    return new Set();
  }
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const dismissed = getSet(DISMISSED_MESSAGES_KEY);
      const read = getSet(READ_MESSAGES_KEY);

      const { data: broadcasts } = await supabase
        .from("broadcast_messages")
        .select("id")
        .eq("is_active", true);
      const unreadBroadcasts = (broadcasts || []).filter(
        (m: any) => !dismissed.has(m.id) && !read.has(m.id)
      ).length;

      let unreadUser = 0;
      if (user) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: c } = await supabase
          .from("user_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false)
          .gte("created_at", sevenDaysAgo.toISOString());
        unreadUser = c ?? 0;
      }

      if (!cancelled) setCount(unreadBroadcasts + unreadUser);
    }

    load();

    const refresh = () => load();
    window.addEventListener("notifications:refresh", refresh);

    let userCh: any;
    if (user) {
      userCh = supabase
        .channel(`unread-count-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
          () => load()
        )
        .subscribe();
    }
    const bcCh = supabase
      .channel("unread-count-broadcasts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_messages" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("notifications:refresh", refresh);
      if (userCh) supabase.removeChannel(userCh);
      supabase.removeChannel(bcCh);
    };
  }, [user]);

  return count;
}
