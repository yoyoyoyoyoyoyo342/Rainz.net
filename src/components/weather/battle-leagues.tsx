import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Trophy, Users, Plus, Crown, Shield, UserPlus, Copy, 
  CheckCircle, XCircle, LogOut, Medal, Target,
  Globe, Lock, Hash, Settings, RefreshCw, Trash2, UserMinus
} from "lucide-react";
import { usePredictionLeagues, League, LeagueLeaderboardEntry, LeagueMember } from "@/hooks/use-prediction-leagues";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const LEAGUE_ICONS = ["🏆", "⚡", "🔥", "❄️", "🌊", "🌪️", "☀️", "🌙", "⭐", "🎯", "🏅", "🎮"];

export function BattleLeagues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
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
    refetch
  } = usePredictionLeagues();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeagueLeaderboardEntry[]>([]);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("🏆");
  const [isPublic, setIsPublic] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  
  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editMaxMembers, setEditMaxMembers] = useState(50);

  const handleCreateLeague = async () => {
    if (!newName.trim()) {
      toast({ title: "Please enter a league name", variant: "destructive" });
      return;
    }
    
    const league = await createLeague(newName, newDescription, newIcon, isPublic);
    if (league) {
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewIcon("🏆");
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast({ title: "Please enter an invite code", variant: "destructive" });
      return;
    }
    
    const success = await joinByCode(joinCode.trim().toLowerCase());
    if (success) {
      setJoinCodeOpen(false);
      setJoinCode("");
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Invite code copied!" });
  };

  const viewLeagueDetails = async (league: League) => {
    setSelectedLeague(league);
    setLoadingLeaderboard(true);
    
    // Initialize edit form with current values
    setEditName(league.name);
    setEditDescription(league.description || "");
    setEditIcon(league.icon);
    setEditIsPublic(league.is_public);
    setEditMaxMembers(league.max_members);
    
    const [lb, membersList] = await Promise.all([
      getLeagueLeaderboard(league.id),
      getLeagueMembers(league.id)
    ]);
    
    setLeaderboard(lb);
    setMembers(membersList);
    setLoadingLeaderboard(false);
  };

  const handleSaveSettings = async () => {
    if (!selectedLeague) return;
    
    const success = await updateLeague(selectedLeague.id, {
      name: editName,
      description: editDescription,
      icon: editIcon,
      is_public: editIsPublic,
      max_members: editMaxMembers
    });
    
    if (success) {
      setSettingsOpen(false);
      // Refresh the selected league data
      const updatedLeagues = await refetch();
      const updated = myLeagues.find(l => l.id === selectedLeague.id);
      if (updated) {
        setSelectedLeague({...updated, name: editName, description: editDescription, icon: editIcon, is_public: editIsPublic, max_members: editMaxMembers});
      }
    }
  };

  const handleRegenerateCode = async () => {
    if (!selectedLeague) return;
    const newCode = await regenerateInviteCode(selectedLeague.id);
    if (newCode) {
      setSelectedLeague({...selectedLeague, invite_code: newCode});
    }
  };

  const handleDeleteLeague = async () => {
    if (!selectedLeague) return;
    const success = await deleteLeague(selectedLeague.id);
    if (success) {
      setDeleteConfirmOpen(false);
      setSelectedLeague(null);
    }
  };

  const handleRemoveMember = async (member: LeagueMember) => {
    const success = await removeMember(member.id);
    if (success) {
      setMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const handleToggleAdmin = async (member: LeagueMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const success = await updateMemberRole(member.id, newRole as 'member' | 'admin');
    if (success) {
      setMembers(prev => prev.map(m => m.id === member.id ? {...m, role: newRole} : m));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-amber-500/20 text-amber-600"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/20 text-blue-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      default:
        return null;
    }
  };

  const isOwnerOrAdmin = selectedLeague?.my_role === 'owner' || selectedLeague?.my_role === 'admin';
  const isOwner = selectedLeague?.my_role === 'owner';

  if (!user) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to join prediction leagues</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create League
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Prediction League</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>League Icon</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {LEAGUE_ICONS.map((icon) => (
                    <Button
                      key={icon}
                      variant={newIcon === icon ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewIcon(icon)}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>League Name</Label>
                <Input
                  placeholder="Storm Chasers United"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="A league for weather enthusiasts..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <Label>Public League</Label>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublic 
                  ? "Anyone can find and join your league"
                  : "Only people with the invite code can join"}
              </p>
              <Button onClick={handleCreateLeague} className="w-full">
                Create League
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={joinCodeOpen} onOpenChange={setJoinCodeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Hash className="w-4 h-4" />
              Join by Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join with Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter invite code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <Button onClick={handleJoinByCode} className="w-full">
                Join League
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invites (for admins) */}
      {pendingInvites.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" />
              Pending Join Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{invite.user_name}</p>
                  <p className="text-xs text-muted-foreground">wants to join {invite.league_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleInvite(invite.id, false)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleInvite(invite.id, true)}>
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Leagues */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          My Leagues
        </h4>
        {myLeagues.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>You haven't joined any leagues yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {myLeagues.map((league) => (
              <Card 
                key={league.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => viewLeagueDetails(league)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{league.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{league.name}</p>
                          {getRoleBadge(league.my_role || '')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {league.member_count} members • Created by {league.owner_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {league.is_public ? (
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Browse Public Leagues */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          Browse Public Leagues
        </h4>
        {publicLeagues.filter(l => !myLeagues.some(ml => ml.id === l.id)).length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No public leagues available</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-64">
            <div className="grid gap-3 pr-4">
              {publicLeagues
                .filter(l => !myLeagues.some(ml => ml.id === l.id))
                .map((league) => (
                  <Card key={league.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{league.icon}</span>
                          <div>
                            <p className="font-medium">{league.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {league.member_count}/{league.max_members} members
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            joinLeague(league.id);
                          }}
                          disabled={(league.member_count || 0) >= league.max_members}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* League Details Dialog */}
      <Dialog open={!!selectedLeague} onOpenChange={(open) => !open && setSelectedLeague(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {selectedLeague && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{selectedLeague.icon}</span>
                  {selectedLeague.name}
                  {isOwner && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="ml-auto"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="leaderboard" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="leaderboard">
                    <Medal className="w-4 h-4 mr-1" />
                    Leaderboard
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    <Users className="w-4 h-4 mr-1" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    <Target className="w-4 h-4 mr-1" />
                    Info
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="leaderboard" className="mt-4 flex-1 overflow-hidden">
                  {loadingLeaderboard ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Medal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No prediction data yet</p>
                      <p className="text-xs">Make predictions to climb the ranks!</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {leaderboard.map((entry, idx) => (
                          <div 
                            key={entry.user_id} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              idx === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                              idx === 1 ? 'bg-slate-400/20 border border-slate-400/30' :
                              idx === 2 ? 'bg-orange-600/20 border border-orange-600/30' :
                              'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg w-6">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </span>
                              <div>
                                <p className="font-medium">{entry.display_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.battles_won} correct / {entry.battles_played} predictions ({entry.win_rate}%)
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{entry.total_points}</p>
                              <p className="text-xs text-muted-foreground">points</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="members" className="mt-4 flex-1 overflow-hidden">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{member.display_name}</p>
                                {getRoleBadge(member.role)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {isOwner && member.role !== 'owner' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleToggleAdmin(member)}
                                title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                              >
                                <Shield className={`w-4 h-4 ${member.role === 'admin' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleRemoveMember(member)}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedLeague.description || 'No description'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-muted-foreground">Members</Label>
                      <p className="text-sm">{selectedLeague.member_count}/{selectedLeague.max_members}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Visibility</Label>
                      <p className="text-sm flex items-center gap-1">
                        {selectedLeague.is_public ? (
                          <><Globe className="w-3 h-3" /> Public</>
                        ) : (
                          <><Lock className="w-3 h-3" /> Private</>
                        )}
                      </p>
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <div className="p-3 bg-muted rounded-lg">
                      <Label className="text-muted-foreground">Invite Code</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-background p-2 rounded text-sm font-mono">
                          {selectedLeague.invite_code}
                        </code>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyInviteCode(selectedLeague.invite_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {isOwner && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleRegenerateCode}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLeague.my_role !== 'owner' && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        leaveLeague(selectedLeague.id);
                        setSelectedLeague(null);
                      }}
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave League
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>League Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>League Icon</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LEAGUE_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    variant={editIcon === icon ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditIcon(icon)}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>League Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editIsPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <Label>Public League</Label>
              </div>
              <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
            </div>
            <div>
              <Label>Max Members</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={editMaxMembers}
                onChange={(e) => setEditMaxMembers(parseInt(e.target.value) || 50)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} className="flex-1">
                Save Changes
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete League?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will permanently delete the league "{selectedLeague?.name}" and remove all members. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLeague}>
              Delete League
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
