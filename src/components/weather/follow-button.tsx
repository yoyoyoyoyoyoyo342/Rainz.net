import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FollowButtonProps {
  targetUserId: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
}

export function FollowButton({ targetUserId, size = "sm", variant = "outline" }: FollowButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
      } else {
        await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: targetUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: () => toast.error("Failed to update follow"),
  });

  if (!user || user.id === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? "ghost" : variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        followMutation.mutate();
      }}
      disabled={followMutation.isPending || isLoading}
      className={isFollowing ? "text-muted-foreground" : ""}
    >
      {followMutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-3.5 w-3.5 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      return { followers: followers || 0, following: following || 0 };
    },
    enabled: !!userId,
  });
}
