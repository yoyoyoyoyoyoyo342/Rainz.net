import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Search, User, Edit2, Save, X, Ban, CheckCircle2, 
  KeyRound, Coins, Trophy, Flame, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_points: number | null;
  shop_points: number;
  created_at: string;
}

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  total_predictions: number;
  total_visits: number;
}

export function AdminUserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ display_name: '', username: '', bio: '', total_points: 0, shop_points: 0 });
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { toast } = useToast();

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, bio, total_points, shop_points, created_at')
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to search users', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setEditMode(false);
    setEditData({
      display_name: user.display_name || '',
      username: user.username || '',
      bio: user.bio || '',
      total_points: user.total_points || 0,
      shop_points: user.shop_points || 0,
    });
    // Fetch streak data
    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, total_predictions, total_visits')
      .eq('user_id', user.user_id)
      .single();
    setUserStreak(data || null);
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editData.display_name || null,
          username: editData.username || null,
          bio: editData.bio || null,
          total_points: editData.total_points,
          shop_points: editData.shop_points,
        })
        .eq('user_id', selectedUser.user_id);
      if (error) throw error;
      toast({ title: 'Saved', description: 'User profile updated' });
      setSelectedUser({ ...selectedUser, ...editData });
      setEditMode(false);
      // Refresh search results
      searchUsers();
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!resetEmail.trim()) return;
    setResettingPassword(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (error) throw error;
      toast({ title: 'Sent', description: `Password reset email sent to ${resetEmail}` });
      setResetDialogOpen(false);
      setResetEmail('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send reset email', variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by display name or username..."
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
          className="flex-1"
        />
        <Button onClick={searchUsers} disabled={searching} size="sm">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        <Button onClick={() => setResetDialogOpen(true)} variant="outline" size="sm" className="gap-1.5">
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Password</span>
        </Button>
      </div>

      {/* User List */}
      {users.length > 0 && !selectedUser && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{users.length} user(s) found</p>
          {users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => selectUser(u)}
              className="w-full p-3 rounded-xl border border-border/30 bg-card/50 hover:border-primary/40 transition-all text-left flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.display_name || 'No name'}</p>
                <p className="text-xs text-muted-foreground truncate">@{u.username || 'unknown'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium">{(u.total_points || 0).toLocaleString()} PP</p>
                <p className="text-xs text-muted-foreground">{u.shop_points} SP</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected User Detail */}
      {selectedUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="gap-1">
              <X className="w-3.5 h-3.5" /> Back
            </Button>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button size="sm" onClick={saveUser} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="p-4 rounded-xl border border-border/30 bg-card/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                {editMode ? (
                  <div className="space-y-2">
                    <Input value={editData.display_name} onChange={(e) => setEditData(d => ({ ...d, display_name: e.target.value }))} placeholder="Display name" className="h-8 text-sm" />
                    <Input value={editData.username} onChange={(e) => setEditData(d => ({ ...d, username: e.target.value }))} placeholder="Username" className="h-8 text-sm" />
                  </div>
                ) : (
                  <>
                    <p className="font-semibold">{selectedUser.display_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username || 'unknown'}</p>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Joined {format(new Date(selectedUser.created_at), 'MMM dd, yyyy')}
            </p>

            {editMode ? (
              <div>
                <Label className="text-xs">Bio</Label>
                <Input value={editData.bio} onChange={(e) => setEditData(d => ({ ...d, bio: e.target.value }))} placeholder="Bio" className="h-8 text-sm" />
              </div>
            ) : selectedUser.bio ? (
              <p className="text-sm text-muted-foreground">{selectedUser.bio}</p>
            ) : null}
          </div>

          {/* Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-border/30 bg-card/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Prediction Points</span>
              </div>
              {editMode ? (
                <Input type="number" value={editData.total_points} onChange={(e) => setEditData(d => ({ ...d, total_points: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
              ) : (
                <p className="text-lg font-bold">{(selectedUser.total_points || 0).toLocaleString()}</p>
              )}
            </div>
            <div className="p-3 rounded-xl border border-border/30 bg-card/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-muted-foreground">Shop Points</span>
              </div>
              {editMode ? (
                <Input type="number" value={editData.shop_points} onChange={(e) => setEditData(d => ({ ...d, shop_points: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
              ) : (
                <p className="text-lg font-bold">{selectedUser.shop_points.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Streak */}
          {userStreak && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Current Streak', value: userStreak.current_streak, icon: <Flame className="w-3 h-3 text-orange-400" /> },
                { label: 'Best Streak', value: userStreak.longest_streak, icon: <Trophy className="w-3 h-3 text-yellow-400" /> },
                { label: 'Predictions', value: userStreak.total_predictions, icon: <CheckCircle2 className="w-3 h-3 text-green-400" /> },
                { label: 'Visits', value: userStreak.total_visits, icon: <User className="w-3 h-3 text-blue-400" /> },
              ].map((stat) => (
                <div key={stat.label} className="p-2 rounded-lg border border-border/30 bg-card/50 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">{stat.icon}<span className="text-[10px] text-muted-foreground">{stat.label}</span></div>
                  <p className="text-sm font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            User ID: {selectedUser.user_id}
          </p>
        </div>
      )}

      {/* No results */}
      {users.length === 0 && !searching && searchQuery && (
        <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Password Reset</DialogTitle>
            <DialogDescription>Enter the user's email address to send them a password reset link.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="resetEmail">Email Address</Label>
            <Input id="resetEmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={sendPasswordReset} disabled={resettingPassword || !resetEmail.trim()}>
              {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <KeyRound className="w-4 h-4 mr-1" />}
              Send Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
