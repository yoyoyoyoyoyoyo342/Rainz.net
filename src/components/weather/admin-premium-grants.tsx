import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Gift, X, Search } from 'lucide-react';
import { format } from 'date-fns';

interface PremiumGrant {
  id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  reason: string | null;
  user_email?: string;
  user_display_name?: string;
}

interface UserSearchResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

export function AdminPremiumGrants() {
  const [grants, setGrants] = useState<PremiumGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGrants();
  }, []);

  async function loadGrants() {
    try {
      const { data, error } = await supabase
        .from('premium_grants')
        .select('*')
        .order('granted_at', { ascending: false });

      if (error) throw error;

      // Get user display names
      const userIds = (data || []).map(g => g.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      setGrants((data || []).map(g => ({
        ...g,
        user_display_name: profileMap.get(g.user_id) || 'Unknown User'
      })));
    } catch (error) {
      console.error('Error loading grants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load premium grants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }

  async function grantPremium() {
    if (!selectedUser) return;

    setGranting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('premium_grants')
        .insert({
          user_id: selectedUser.user_id,
          granted_by: user.id,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          reason: reason || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Premium granted to ${selectedUser.display_name || selectedUser.username}`,
      });

      setSelectedUser(null);
      setExpiresAt('');
      setReason('');
      setSearchQuery('');
      setSearchResults([]);
      loadGrants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant premium',
        variant: 'destructive',
      });
    } finally {
      setGranting(false);
    }
  }

  async function revokeGrant(grantId: string) {
    try {
      const { error } = await supabase
        .from('premium_grants')
        .update({ is_active: false })
        .eq('id', grantId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Premium grant revoked',
      });

      loadGrants();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke grant',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Grant Free Premium
          </CardTitle>
          <CardDescription>Give users free Rainz+ access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="userSearch">Search User</Label>
              <div className="flex gap-2">
                <Input
                  id="userSearch"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or username..."
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {searchResults.length > 0 && !selectedUser && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.user_id}
                  className="w-full px-4 py-2 text-left hover:bg-muted/50 border-b last:border-b-0"
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchResults([]);
                  }}
                >
                  <div className="font-medium">{user.display_name || 'No display name'}</div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="p-3 bg-muted rounded-md flex items-center justify-between">
              <div>
                <div className="font-medium">{selectedUser.display_name}</div>
                <div className="text-sm text-muted-foreground">@{selectedUser.username}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiresAt">Expires At (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Beta tester, Contest winner"
              />
            </div>
          </div>

          <Button onClick={grantPremium} disabled={!selectedUser || granting}>
            <Gift className="w-4 h-4 mr-2" />
            {granting ? 'Granting...' : 'Grant Premium'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Premium Grants</CardTitle>
          <CardDescription>Users with free premium access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No premium grants yet
                  </TableCell>
                </TableRow>
              ) : (
                grants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-medium">
                      {grant.user_display_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(grant.granted_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {grant.expires_at
                        ? format(new Date(grant.expires_at), 'MMM dd, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>{grant.reason || '-'}</TableCell>
                    <TableCell>
                      {grant.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {grant.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeGrant(grant.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}