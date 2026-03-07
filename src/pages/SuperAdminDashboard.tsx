import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, LogOut, Loader2, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Restaurant {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  status: string;
  trial_end_date: string | null;
  created_at: string;
}

const SuperAdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRestaurants(data as Restaurant[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('restaurants').update({ status }).eq('id', id);
    toast.success(`Restaurant ${status}`);
    fetchRestaurants();
  };

  const extendTrial = async (id: string) => {
    const newDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('restaurants').update({ trial_end_date: newDate, status: 'trial' }).eq('id', id);
    toast.success('Trial extended by 30 days');
    fetchRestaurants();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/staff/login');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Restaurants ({restaurants.length})</h2>
          <Button variant="outline" size="sm" onClick={fetchRestaurants}>
            <RotateCcw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No restaurants registered yet.</p>
          </div>
        ) : (
          restaurants.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <Badge variant={statusColor(r.status) as any} className="capitalize">
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.owner_name || 'No owner'} • {r.owner_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.trial_end_date && ` • Trial ends ${formatDistanceToNow(new Date(r.trial_end_date), { addSuffix: true })}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {r.status !== 'active' && (
                      <Button size="sm" onClick={() => updateStatus(r.id, 'active')}>
                        <Play className="w-3 h-3 mr-1" /> Activate
                      </Button>
                    )}
                    {r.status !== 'suspended' && (
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, 'suspended')}>
                        <Pause className="w-3 h-3 mr-1" /> Suspend
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => extendTrial(r.id)}>
                      +30 days
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
