import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export interface League {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  created_by: string;
  is_public: boolean;
  max_members: number;
  invite_code: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  my_role?: string;
  owner_name?: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name?: string;
}

export interface LeagueInvite {
  id: string;
  league_id: string;
  user_id: string;
  status: string;
  created_at: string;
  league_name?: string;
  user_name?: string;
}

export interface LeagueLeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  battles_won: number;
  battles_played: number;
  win_rate: number;
}

export function usePredictionLeagues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LeagueInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyLeagues = useCallback(async () => {
    if (!user) return;

    try {
      // Get leagues where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('league_members')
        .select('league_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const leagueIds = memberData.map(m => m.league_id);
        
        const { data: leagues, error: leaguesError } = await supabase
          .from('prediction_leagues')
          .select('*')
          .in('id', leagueIds);

        if (leaguesError) throw leaguesError;

        // Get member counts and owner names
        const enrichedLeagues = await Promise.all((leagues || []).map(async (league) => {
          const { count } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', league.id);

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', league.created_by)
            .single();

          const myMembership = memberData.find(m => m.league_id === league.id);

          return {
            ...league,
            member_count: count || 0,
            my_role: myMembership?.role,
            owner_name: ownerProfile?.display_name || 'Unknown'
          };
        }));

        setMyLeagues(enrichedLeagues);
      } else {
        setMyLeagues([]);
      }
    } catch (error) {
      console.error('Error fetching my leagues:', error);
    }
  }, [user]);

  const fetchPublicLeagues = useCallback(async () => {
    try {
      const { data: leagues, error } = await supabase
        .from('prediction_leagues')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Enrich with member counts
      const enrichedLeagues = await Promise.all((leagues || []).map(async (league) => {
        const { count } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', league.created_by)
          .single();

        return {
          ...league,
          member_count: count || 0,
          owner_name: ownerProfile?.display_name || 'Unknown'
        };
      }));

      setPublicLeagues(enrichedLeagues);
    } catch (error) {
      console.error('Error fetching public leagues:', error);
    }
  }, []);

  const fetchPendingInvites = useCallback(async () => {
    if (!user) return;

    try {
      // Get leagues where user is admin/owner to see pending requests
      const { data: adminLeagues } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

      if (adminLeagues && adminLeagues.length > 0) {
        const leagueIds = adminLeagues.map(l => l.league_id);
        
        const { data: invites, error } = await supabase
          .from('league_invites')
          .select('*')
          .in('league_id', leagueIds)
          .eq('status', 'pending');

        if (error) throw error;

        // Enrich with names
        const enrichedInvites = await Promise.all((invites || []).map(async (invite) => {
          const { data: league } = await supabase
            .from('prediction_leagues')
            .select('name')
            .eq('id', invite.league_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', invite.user_id)
            .single();

          return {
            ...invite,
            league_name: league?.name,
            user_name: profile?.display_name || 'Unknown'
          };
        }));

        setPendingInvites(enrichedInvites);
      }
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  }, [user]);

  const createLeague = async (name: string, description: string, icon: string, isPublic: boolean) => {
    if (!user) return null;

    try {
      const { data: league, error } = await supabase
        .from('prediction_leagues')
        .insert({
          name,
          description,
          icon,
          is_public: isPublic,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner
      await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'owner'
        });

      toast({
        title: "League created!",
        description: `${name} is ready for battles`,
      });

      await fetchMyLeagues();
      return league;
    } catch (error) {
      console.error('Error creating league:', error);
      toast({
        title: "Failed to create league",
        variant: "destructive",
      });
      return null;
    }
  };

  const joinLeague = async (leagueId: string, inviteCode?: string) => {
    if (!user) return false;

    try {
      // Check if league exists and verify invite code if private
      const { data: league, error: leagueError } = await supabase
        .from('prediction_leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError || !league) {
        toast({ title: "League not found", variant: "destructive" });
        return false;
      }

      if (!league.is_public && league.invite_code !== inviteCode) {
        toast({ title: "Invalid invite code", variant: "destructive" });
        return false;
      }

      // Check member count
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId);

      if ((count || 0) >= league.max_members) {
        toast({ title: "League is full", variant: "destructive" });
        return false;
      }

      // For public leagues, join directly
      if (league.is_public) {
        const { error } = await supabase
          .from('league_members')
          .insert({
            league_id: leagueId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        toast({
          title: "Joined league!",
          description: `Welcome to ${league.name}`,
        });
      } else {
        // For private leagues, create a join request
        const { error } = await supabase
          .from('league_invites')
          .insert({
            league_id: leagueId,
            user_id: user.id,
            status: 'pending'
          });

        if (error) throw error;

        toast({
          title: "Request sent!",
          description: "Waiting for admin approval",
        });
      }

      await fetchMyLeagues();
      await fetchPublicLeagues();
      return true;
    } catch (error) {
      console.error('Error joining league:', error);
      toast({ title: "Failed to join league", variant: "destructive" });
      return false;
    }
  };

  const joinByCode = async (inviteCode: string) => {
    if (!user) return false;

    try {
      const { data: league, error } = await supabase
        .from('prediction_leagues')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (error || !league) {
        toast({ title: "Invalid invite code", variant: "destructive" });
        return false;
      }

      return await joinLeague(league.id, inviteCode);
    } catch (error) {
      console.error('Error joining by code:', error);
      return false;
    }
  };

  const leaveLeague = async (leagueId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: "Left the league" });
      await fetchMyLeagues();
      return true;
    } catch (error) {
      console.error('Error leaving league:', error);
      return false;
    }
  };

  const handleInvite = async (inviteId: string, accept: boolean) => {
    try {
      const { data: invite } = await supabase
        .from('league_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (!invite) return;

      if (accept) {
        // Add as member
        await supabase
          .from('league_members')
          .insert({
            league_id: invite.league_id,
            user_id: invite.user_id,
            role: 'member'
          });
      }

      // Update invite status
      await supabase
        .from('league_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId);

      toast({
        title: accept ? "Member accepted" : "Request declined",
      });

      await fetchPendingInvites();
    } catch (error) {
      console.error('Error handling invite:', error);
    }
  };

  const getLeagueLeaderboard = async (leagueId: string): Promise<LeagueLeaderboardEntry[]> => {
    try {
      // Get all league members
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);

      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      // Get prediction stats for league members from weather_predictions
      const { data: predictions } = await supabase
        .from('weather_predictions')
        .select('user_id, is_correct, points_earned')
        .in('user_id', userIds)
        .not('is_correct', 'is', null);

      // Calculate stats per user
      const stats: Record<string, { correct: number; total: number; points: number }> = {};
      
      userIds.forEach(id => {
        stats[id] = { correct: 0, total: 0, points: 0 };
      });

      (predictions || []).forEach(pred => {
        if (stats[pred.user_id]) {
          stats[pred.user_id].total++;
          if (pred.is_correct) {
            stats[pred.user_id].correct++;
          }
          stats[pred.user_id].points += pred.points_earned || 0;
        }
      });

      // Get display names and format leaderboard
      const leaderboard: LeagueLeaderboardEntry[] = await Promise.all(
        userIds.map(async (userId) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', userId)
            .single();

          const userStats = stats[userId];
          return {
            user_id: userId,
            display_name: profile?.display_name || 'Unknown',
            total_points: userStats.points,
            battles_won: userStats.correct,
            battles_played: userStats.total,
            win_rate: userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0
          };
        })
      );

      return leaderboard.sort((a, b) => b.total_points - a.total_points);
    } catch (error) {
      console.error('Error getting league leaderboard:', error);
      return [];
    }
  };

  const getLeagueMembers = async (leagueId: string): Promise<LeagueMember[]> => {
    try {
      const { data: members, error } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId);

      if (error) throw error;

      // Enrich with display names
      const enrichedMembers = await Promise.all((members || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', member.user_id)
          .single();

        return {
          ...member,
          display_name: profile?.display_name || 'Unknown'
        };
      }));

      return enrichedMembers;
    } catch (error) {
      console.error('Error getting league members:', error);
      return [];
    }
  };

  const updateLeague = async (leagueId: string, updates: { name?: string; description?: string; icon?: string; is_public?: boolean; max_members?: number }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('prediction_leagues')
        .update(updates)
        .eq('id', leagueId)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({ title: "League updated!" });
      await fetchMyLeagues();
      return true;
    } catch (error) {
      console.error('Error updating league:', error);
      toast({ title: "Failed to update league", variant: "destructive" });
      return false;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'member' | 'admin') => {
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: `Role updated to ${newRole}` });
      return true;
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({ title: "Failed to update role", variant: "destructive" });
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: "Member removed" });
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: "Failed to remove member", variant: "destructive" });
      return false;
    }
  };

  const regenerateInviteCode = async (leagueId: string) => {
    if (!user) return null;

    try {
      const newCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      
      const { error } = await supabase
        .from('prediction_leagues')
        .update({ invite_code: newCode })
        .eq('id', leagueId)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({ title: "Invite code regenerated!" });
      await fetchMyLeagues();
      return newCode;
    } catch (error) {
      console.error('Error regenerating invite code:', error);
      toast({ title: "Failed to regenerate code", variant: "destructive" });
      return null;
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!user) return false;

    try {
      // Delete all members first
      await supabase
        .from('league_members')
        .delete()
        .eq('league_id', leagueId);

      // Delete the league
      const { error } = await supabase
        .from('prediction_leagues')
        .delete()
        .eq('id', leagueId)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({ title: "League deleted" });
      await fetchMyLeagues();
      return true;
    } catch (error) {
      console.error('Error deleting league:', error);
      toast({ title: "Failed to delete league", variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyLeagues(),
        fetchPublicLeagues(),
        fetchPendingInvites()
      ]);
      setLoading(false);
    };
    init();
  }, [user, fetchMyLeagues, fetchPublicLeagues, fetchPendingInvites]);

  return {
    myLeagues,
    publicLeagues,
    pendingInvites,
    loading,
    createLeague,
    joinLeague,
    joinByCode,
    leaveLeague,
    handleInvite,
    getLeagueLeaderboard,
    getLeagueMembers,
    updateLeague,
    updateMemberRole,
    removeMember,
    regenerateInviteCode,
    deleteLeague,
    refetch: () => Promise.all([fetchMyLeagues(), fetchPublicLeagues(), fetchPendingInvites()])
  };
}
