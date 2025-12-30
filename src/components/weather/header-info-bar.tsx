import { useState, useEffect, useMemo } from "react";
import { Bell, Flame, Trophy, X, Inbox, Circle, Swords, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserStreaks } from "@/hooks/use-user-streaks";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

interface BroadcastMessage {
  id: string;
  message: string;
  created_at: string;
  audience?: string;
  audience_filter?: any;
}

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

const DISMISSED_MESSAGES_KEY = "dismissed_broadcast_messages";
const READ_MESSAGES_KEY = "read_broadcast_messages";

function getDismissedMessages(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_MESSAGES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function getReadMessages(): Set<string> {
  try {
    const stored = localStorage.getItem(READ_MESSAGES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markMessageAsDismissed(messageId: string) {
  const dismissed = getDismissedMessages();
  dismissed.add(messageId);
  localStorage.setItem(DISMISSED_MESSAGES_KEY, JSON.stringify([...dismissed]));
}

function markMessageAsRead(messageId: string) {
  const read = getReadMessages();
  read.add(messageId);
  localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify([...read]));
}

interface HeaderInfoBarProps {
  user: any;
}

function isMessageForUser(message: BroadcastMessage, isSubscribed: boolean) {
  const audience = message.audience ?? "all";
  if (audience === "all") return true;
  if (audience === "premium") return isSubscribed;
  if (audience === "free") return !isSubscribed;
  return true;
}

export function HeaderInfoBar({ user }: HeaderInfoBarProps) {
  const { streakData, loading: streakLoading } = useUserStreaks();
  const { isSubscribed } = useSubscription();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setDismissedIds(getDismissedMessages());
    setReadIds(getReadMessages());

    async function loadMessages() {
      const { data } = await supabase
        .from("broadcast_messages")
        .select("id,message,created_at,audience,audience_filter")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data) setMessages(data as BroadcastMessage[]);
    }

    loadMessages();

    const broadcastChannel = supabase
      .channel("header-broadcast-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcast_messages" },
        (payload) => {
          const newMessage = payload.new as BroadcastMessage;
          setMessages((prev) => [newMessage, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserNotifications([]);
      return;
    }

    async function loadUserNotifications() {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setUserNotifications(data as UserNotification[]);
    }

    loadUserNotifications();

    const userChannel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as UserNotification;
          setUserNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [user]);

  const visibleMessages = useMemo(() => {
    return messages
      .filter((m) => !dismissedIds.has(m.id))
      .filter((m) => isMessageForUser(m, isSubscribed));
  }, [messages, dismissedIds, isSubscribed]);

  const unreadBroadcasts = useMemo(() => {
    return visibleMessages.filter((m) => !readIds.has(m.id));
  }, [visibleMessages, readIds]);

  const unreadUserNotifications = useMemo(() => {
    return userNotifications.filter((n) => !n.is_read);
  }, [userNotifications]);

  const totalUnread = unreadBroadcasts.length + unreadUserNotifications.length;

  useEffect(() => {
    if (isOpen && visibleMessages.length > 0) {
      visibleMessages.forEach((m) => {
        if (!readIds.has(m.id)) markMessageAsRead(m.id);
      });
      setReadIds(getReadMessages());
    }

    if (isOpen && userNotifications.length > 0 && user) {
      const unreadNotifications = userNotifications.filter((n) => !n.is_read);
      if (unreadNotifications.length > 0) {
        supabase
          .from("user_notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false)
          .then(() => {
            setUserNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
          });
      }
    }
  }, [isOpen, visibleMessages, userNotifications, user, readIds]);

  const handleDismiss = (id: string) => {
    markMessageAsDismissed(id);
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleDismissUserNotification = async (id: string) => {
    await supabase.from("user_notifications").delete().eq("id", id);
    setUserNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "battle_challenge":
        return <Swords className="h-4 w-4 text-yellow-500" />;
      case "battle_accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "battle_result":
        return <Trophy className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {user && streakData && !streakLoading && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-full border border-primary/20">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">{streakData.currentStreak}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">day streak</span>
          <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-primary/20">
            <Trophy className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{streakData.longestStreak}</span>
          </div>
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
            <Inbox className="h-4 w-4" />
            {totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-destructive rounded-full animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-popover border border-border shadow-lg z-[9999]" align="end">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalUnread} new
              </Badge>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {visibleMessages.length === 0 && userNotifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {userNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 transition-colors ${!notification.is_read ? "bg-primary/5" : "bg-background"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.is_read && (
                        <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary shrink-0" />
                      )}
                      <div className="shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary mb-1">{notification.title}</p>
                        <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                          {notification.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            part.match(/^https?:\/\//) ? (
                              <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {part}
                              </a>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10"
                        onClick={() => handleDismissUserNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {visibleMessages.map((message) => {
                  const isUnread = !readIds.has(message.id);
                  return (
                    <div
                      key={message.id}
                      className={`p-3 transition-colors ${isUnread ? "bg-primary/5" : "bg-background"}`}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary mb-1">Admin Announcement</p>
                          <p className="text-sm text-foreground break-words">{message.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(message.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10"
                          onClick={() => handleDismiss(message.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
