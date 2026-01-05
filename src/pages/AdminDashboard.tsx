import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Check, X, LogOut, ArrowLeft, Building2, Phone, Mail, Calendar } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStatus = Database['public']['Enums']['user_status'];

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profiles',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [toast]);

  const updateStatus = async (profileId: string, newStatus: UserStatus) => {
    setUpdating(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, status: newStatus } : p
      ));

      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'approved' : 'denied'} successfully`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
  };

  const filterByStatus = (status: UserStatus) =>
    profiles.filter(p => p.status === status);

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const UserTable = ({ users, showActions = false }: { users: Profile[]; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Signed Up</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-medium">{profile.full_name || 'N/A'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {profile.email}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {profile.company_name || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {profile.cell_phone || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(profile.created_at)}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(profile.status)}</TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                      onClick={() => updateStatus(profile.id, 'active')}
                      disabled={updating === profile.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                      onClick={() => updateStatus(profile.id, 'denied')}
                      disabled={updating === profile.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{filterByStatus('pending').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{filterByStatus('active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{filterByStatus('denied').length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending ({filterByStatus('pending').length})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active ({filterByStatus('active').length})
                </TabsTrigger>
                <TabsTrigger value="denied">
                  Denied ({filterByStatus('denied').length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <UserTable users={filterByStatus('pending')} showActions />
              </TabsContent>
              <TabsContent value="active">
                <UserTable users={filterByStatus('active')} />
              </TabsContent>
              <TabsContent value="denied">
                <UserTable users={filterByStatus('denied')} showActions />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
