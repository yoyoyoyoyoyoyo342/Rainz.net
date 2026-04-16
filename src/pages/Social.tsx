import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, MessageSquare, Heart, LogIn, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/seo-head";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SocialPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"feed" | "notifications">("feed");
  const [postContent, setPostContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

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
    enabled: !!user && tab === "notifications",
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
        .limit(50);
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      // Check user's likes
      const postIds = data.map((p: any) => p.id);
      const { data: userLikes } = await supabase
        .from("social_post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      const likedSet = new Set(userLikes?.map((l: any) => l.post_id) || []);

      return data.map((post: any) => ({
        ...post,
        display_name: (profileMap.get(post.user_id) as any)?.display_name || "User",
        avatar_url: (profileMap.get(post.user_id) as any)?.avatar_url,
        is_liked: likedSet.has(post.id),
      }));
    },
    enabled: !!user && tab === "feed",
  });

  // Comments for expanded posts
  const { data: commentsMap = {} } = useQuery({
    queryKey: ["social-comments", [...expandedComments]],
    queryFn: async () => {
      if (expandedComments.size === 0) return {};
      const postIds = [...expandedComments];
      const { data: comments } = await supabase
        .from("social_post_comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });
      if (!comments) return {};

      const userIds = [...new Set(comments.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);

      const map: Record<string, any[]> = {};
      comments.forEach((c: any) => {
        if (!map[c.post_id]) map[c.post_id] = [];
        map[c.post_id].push({ ...c, display_name: nameMap.get(c.user_id) || "User" });
      });
      return map;
    },
    enabled: expandedComments.size > 0,
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
        post_type: "user",
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

  // Like/unlike
  const likeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (liked) {
        await supabase.from("social_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("social_post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-posts-feed"] }),
  });

  // Add comment
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("social_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["social-comments"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts-feed"] });
      setCommentInputs((prev) => ({ ...prev, [vars.postId]: "" }));
    },
    onError: () => toast.error("Failed to comment"),
  });

  const postTypeEmoji: Record<string, string> = {
    streak_milestone: "🔥",
    achievement: "🏆",
    leaderboard: "👑",
    user: "",
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  if (!user) {
    return (
      <>
        <SEOHead title="Social — Rainz Weather" description="See what's happening in the Rainz community" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="glass-card max-w-sm w-full">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Social Feed</h2>
              <p className="text-sm text-muted-foreground text-center">
                Post updates, react to weather, and see what your friends are up to. Sign in to join!
              </p>
              <Button onClick={() => navigate("/auth")} className="gap-2 w-full">
                <LogIn className="w-4 h-4" /> Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomTabBar />
      </>
    );
  }

  return (
    <>
      <SEOHead title="Social — Rainz Weather" description="See what's happening in the Rainz community" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Social</h1>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1">
            <button
              onClick={() => setTab("feed")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === "feed" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => {
                setTab("notifications");
                if (unreadCount > 0) markReadMutation.mutate();
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                tab === "notifications" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              Notifications {unreadCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{unreadCount}</Badge>}
            </button>
          </div>

          {/* Feed tab */}
          {tab === "feed" && (
            <div className="space-y-3">
              {/* Post composer */}
              <div className="p-4 rounded-2xl glass-card border border-border/20 space-y-3">
                <Textarea
                  placeholder="What's the weather like? Share with your followers..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[70px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-sm"
                  maxLength={280}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{postContent.length}/280</span>
                  <Button
                    size="sm"
                    onClick={() => postContent.trim() && createPostMutation.mutate(postContent.trim())}
                    disabled={!postContent.trim() || createPostMutation.isPending}
                    className="h-8 gap-1"
                  >
                    <Send className="h-3.5 w-3.5" /> Post
                  </Button>
                </div>
              </div>

              {loadingPosts && [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
              {!loadingPosts && posts.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No posts yet. Follow people to see their posts!</p>
                </div>
              )}
              {posts.map((post: any) => (
                <div key={post.id} className="p-4 rounded-2xl glass-card border border-border/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                    >
                      {(post.display_name || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-medium text-sm cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                      >
                        {post.display_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {post.post_type !== "user" && (
                      <span className="text-lg">{postTypeEmoji[post.post_type] || ""}</span>
                    )}
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>

                  {post.location_name && (
                    <p className="text-[10px] text-muted-foreground">📍 {post.location_name}</p>
                  )}

                  {/* Like + Comment actions */}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => likeMutation.mutate({ postId: post.id, liked: post.is_liked })}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        post.is_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.is_liked ? "fill-current" : ""}`} />
                      {post.like_count > 0 && <span>{post.like_count}</span>}
                    </button>
                    <button
                      onClick={() => {
                        setExpandedComments((prev) => {
                          const next = new Set(prev);
                          next.has(post.id) ? next.delete(post.id) : next.add(post.id);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {post.comment_count > 0 && <span>{post.comment_count}</span>}
                      {expandedComments.has(post.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {/* Comments section */}
                  {expandedComments.has(post.id) && (
                    <div className="space-y-2 pt-2 border-t border-border/10">
                      {(commentsMap[post.id] || []).map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                            {(comment.display_name || "U")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-xs">{comment.display_name}</span>
                            <p className="text-xs text-foreground/80">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && commentInputs[post.id]?.trim()) {
                              commentMutation.mutate({ postId: post.id, content: commentInputs[post.id].trim() });
                            }
                          }}
                          className="h-8 text-xs"
                          maxLength={200}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          disabled={!commentInputs[post.id]?.trim()}
                          onClick={() => {
                            if (commentInputs[post.id]?.trim()) {
                              commentMutation.mutate({ postId: post.id, content: commentInputs[post.id].trim() });
                            }
                          }}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Notifications tab */}
          {tab === "notifications" && (
            <div className="space-y-2">
              {loadingNotifs && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              {!loadingNotifs && notifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
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
            </div>
          )}
        </div>
      </div>
      <BottomTabBar />
    </>
  );
}
