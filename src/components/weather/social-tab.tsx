import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, MessageSquare, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SocialTabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialTab({ open, onOpenChange }: SocialTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"notifications" | "feed">("notifications");
  const [postContent, setPostContent] = useState("");

  // Notifications
  const { data: notifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user && open,
  });

  // Social posts feed
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["social-posts-feed", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!data || data.length === 0) return [];

      // Get display names
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return data.map((post: any) => ({
        ...post,
        display_name: (profileMap.get(post.user_id) as any)?.display_name || "User",
        avatar_url: (profileMap.get(post.user_id) as any)?.avatar_url,
      }));
    },
    enabled: !!user && open && tab === "feed",
  });

  // Mark notifications as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  // Create post
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts-feed"] });
      setPostContent("");
      toast.success("Post shared!");
    },
    onError: () => toast.error("Failed to post"),
  });

  const handlePost = () => {
    if (postContent.trim()) {
      createPostMutation.mutate(postContent.trim());
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="glass-card rounded-t-3xl h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/40 mx-auto mb-2" />
          <SheetTitle className="text-lg">Social</SheetTitle>
        </SheetHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 px-5 pb-3">
          <button
            onClick={() => {
              setTab("notifications");
              if (unreadCount > 0) markReadMutation.mutate();
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "notifications" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            Notifications {unreadCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{unreadCount}</Badge>}
          </button>
          <button
            onClick={() => setTab("feed")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "feed" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            Feed
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
          {!user && (
            <p className="text-center text-muted-foreground text-sm py-8">Sign in to see your social feed</p>
          )}

          {/* Notifications tab */}
          {user && tab === "notifications" && (
            <>
              {loadingNotifs && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              {!loadingNotifs && notifications.length === 0 && (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              )}
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl transition-colors ${n.is_read ? "bg-muted/20" : "bg-primary/5 border border-primary/10"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </>
          )}

          {/* Feed tab */}
          {user && tab === "feed" && (
            <>
              {/* Post composer */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-2">
                <Textarea
                  placeholder="What's the weather like? Share with your followers..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[60px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-sm"
                  maxLength={280}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{postContent.length}/280</span>
                  <Button
                    size="sm"
                    onClick={handlePost}
                    disabled={!postContent.trim() || createPostMutation.isPending}
                    className="h-8 gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Post
                  </Button>
                </div>
              </div>

              {loadingPosts && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              {!loadingPosts && posts.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No posts yet. Follow people to see their posts!</p>
                </div>
              )}
              {posts.map((post: any) => (
                <div
                  key={post.id}
                  className="p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(post.display_name || "U")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{post.display_name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>
                  {post.location_name && (
                    <p className="text-[10px] text-muted-foreground mt-1">📍 {post.location_name}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
