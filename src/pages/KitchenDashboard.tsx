import { useRestaurant } from '@/context/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, LogOut, Clock, Volume2, VolumeX, Check, X, CookingPot, CircleCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNewOrderSound } from '@/hooks/useNewOrderSound';
import { useState } from 'react';

const KitchenDashboard = () => {
  const { orders, updateOrderStatus, updateOrderItemStatus } = useRestaurant();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const kitchenOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  useNewOrderSound(soundEnabled ? pendingCount : -1);

  const handleLogout = async () => {
    await signOut();
    navigate('/staff/login');
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-primary/20 text-primary border-0 text-xs">Accepted</Badge>;
      case 'preparing': return <Badge className="bg-yellow-500/20 text-yellow-600 border-0 text-xs">Preparing</Badge>;
      case 'ready': return <Badge className="bg-green-500/20 text-green-600 border-0 text-xs">Ready</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getOrderNumber = (order: any) => (order as any).order_number ? `#${(order as any).order_number}` : '';

  return (
    <div className="min-h-screen dark bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kitchen Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{kitchenOrders.length} active</Badge>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Mute' : 'Unmute'}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {kitchenOrders.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No pending orders</p>
            <p className="text-sm mt-1">New orders will appear here instantly</p>
          </div>
        )}
        {kitchenOrders.map(order => (
          <div key={order.id} className="bg-card rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  Order {getOrderNumber(order)}
                </span>
                <Badge variant="outline" className="text-xs">Table {order.table_number}</Badge>
                <Badge variant={order.status === 'pending' ? 'destructive' : 'secondary'}>
                  {order.status === 'pending' ? 'NEW' : 'In Progress'}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="space-y-2">
              {order.items.map((item) => {
                const itemStatus = (item as any).status || 'pending';
                const itemNote = (item as any).note || '';
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm flex-1">
                        <span className="font-mono font-bold text-primary">{item.quantity}×</span>
                        <span className={itemStatus === 'rejected' ? 'line-through text-muted-foreground' : ''}>{item.item_name}</span>
                        {getItemStatusBadge(itemStatus)}
                      </div>
                      <div className="flex gap-1">
                        {order.status === 'pending' && itemStatus === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                              onClick={() => updateOrderItemStatus(item.id, 'accepted', order.id)}
                              title="Accept"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => updateOrderItemStatus(item.id, 'rejected', order.id)}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {itemStatus === 'accepted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => updateOrderItemStatus(item.id, 'preparing', order.id)}
                          >
                            <CookingPot className="w-3 h-3 mr-1" /> Preparing
                          </Button>
                        )}
                        {itemStatus === 'preparing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-600 border-green-600/30 hover:bg-green-600/10"
                            onClick={() => updateOrderItemStatus(item.id, 'ready', order.id)}
                          >
                            <CircleCheck className="w-3 h-3 mr-1" /> Ready
                          </Button>
                        )}
                      </div>
                    </div>
                    {itemNote && itemStatus !== 'rejected' && (
                      <p className="text-xs text-yellow-600 ml-8 italic">⚠ {itemNote}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {order.notes && <p className="text-sm text-muted-foreground italic">Note: {order.notes}</p>}

            {order.status === 'pending' && order.items.every(i => (i as any).status === 'pending') && (
              <p className="text-xs text-muted-foreground text-center">Review each item above</p>
            )}

            {order.status === 'in_progress' && order.items.filter(i => (i as any).status !== 'rejected').every(i => (i as any).status === 'ready') && (
              <Button
                className="w-full"
                onClick={() => updateOrderStatus(order.id, 'completed')}
              >
                Mark Order Completed
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDashboard;
