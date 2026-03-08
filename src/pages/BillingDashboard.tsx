import { useState, useMemo } from 'react';
import { useRestaurant, Order, TableSession } from '@/context/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, LogOut, Printer, CreditCard, Banknote, History, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../supabase/types/restaurant';
import { useAuth } from '@/hooks/useAuth';

interface SessionGroup {
  session: TableSession;
  orders: Order[];
  total: number;
}

const BillingDashboard = () => {
  const { orders, sessions, updateOrderStatus, updateOrderCustomer, updateOrderPayment, closeSession, restaurantName } = useRestaurant();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [editingCustomer, setEditingCustomer] = useState<Record<string, { name: string; phone: string }>>({});

  // Group orders by session for billing queue
  const openSessions: SessionGroup[] = useMemo(() => {
    const openSess = sessions.filter(s => s.status === 'open');
    return openSess.map(session => {
      const sessionOrders = orders.filter(o => (o as any).session_id === session.id && o.status !== 'rejected');
      const total = sessionOrders.reduce((sum, o) => sum + o.total_amount, 0);
      return { session, orders: sessionOrders, total };
    }).filter(sg => sg.orders.some(o => o.status === 'completed'));
  }, [sessions, orders]);

  // Also show individual completed orders without session (backwards compat)
  const unlinkedQueue = orders.filter(o => o.status === 'completed' && !(o as any).session_id);

  const closedSessions: SessionGroup[] = useMemo(() => {
    const closed = sessions.filter(s => s.status === 'closed');
    return closed.map(session => {
      const sessionOrders = orders.filter(o => (o as any).session_id === session.id);
      const total = sessionOrders.reduce((sum, o) => sum + o.total_amount, 0);
      return { session, orders: sessionOrders, total };
    }).filter(sg => sg.orders.length > 0);
  }, [sessions, orders]);

  const billingHistory = orders.filter(o => o.status === 'billed' && !(o as any).session_id);

  const handleLogout = async () => {
    await signOut();
    navigate('/staff/login');
  };

  const startEditCustomer = (orderId: string, name: string, phone: string) => {
    setEditingCustomer(prev => ({ ...prev, [orderId]: { name, phone } }));
  };

  const saveCustomer = (orderId: string) => {
    const data = editingCustomer[orderId];
    if (data) {
      updateOrderCustomer(orderId, data.name, data.phone);
      setEditingCustomer(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handlePrintSession = (sg: SessionGroup) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const allItems = sg.orders.flatMap(o => o.items.filter(i => (i as any).status !== 'rejected'));
    win.document.write(`
      <html><head><title>Bill - Table ${sg.session.table_number}</title>
      <style>body{font-family:monospace;padding:20px;max-width:350px;margin:0 auto}h2{text-align:center;margin-bottom:4px}p.sub{text-align:center;font-size:0.85em;color:#666}hr{border:none;border-top:1px dashed #333;margin:10px 0}.item{display:flex;justify-content:space-between;padding:2px 0}.total{font-size:1.2em;font-weight:bold;display:flex;justify-content:space-between;padding:6px 0}</style></head>
      <body>
        <h2>${restaurantName}</h2>
        <p class="sub">Table ${sg.session.table_number}</p>
        <p class="sub">${sg.orders.length} order(s)</p>
        <hr/>
        ${allItems.map(i => `<div class="item"><span>${i.quantity}× ${i.item_name}</span><span>${formatCurrency(i.price * i.quantity)}</span></div>`).join('')}
        <hr/>
        <div class="total"><span>TOTAL</span><span>${formatCurrency(sg.total)}</span></div>
        <hr/>
        <p style="text-align:center;font-size:0.8em;color:#666;margin-top:16px">Thank you for dining with us!</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const handlePrint = (order: Order) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Bill - Table ${order.table_number}</title>
      <style>body{font-family:monospace;padding:20px;max-width:350px;margin:0 auto}h2{text-align:center;margin-bottom:4px}p.sub{text-align:center;font-size:0.85em;color:#666}hr{border:none;border-top:1px dashed #333;margin:10px 0}.item{display:flex;justify-content:space-between;padding:2px 0}.total{font-size:1.2em;font-weight:bold;display:flex;justify-content:space-between;padding:6px 0}</style></head>
      <body>
        <h2>${restaurantName}</h2>
        <p class="sub">Table ${order.table_number}</p>
        <hr/>
        ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}
        ${order.customer_phone ? `<p>Phone: ${order.customer_phone}</p>` : ''}
        <hr/>
        ${order.items.map(i => `<div class="item"><span>${i.quantity}× ${i.item_name}</span><span>${formatCurrency(i.price * i.quantity)}</span></div>`).join('')}
        <hr/>
        <div class="total"><span>TOTAL</span><span>${formatCurrency(order.total_amount)}</span></div>
        <hr/>
        <p style="text-align:center;font-size:0.8em;color:#666;margin-top:16px">Thank you for dining with us!</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const [sessionPayment, setSessionPayment] = useState<Record<string, 'cash' | 'card'>>({});

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Billing</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{openSessions.length + unlinkedQueue.length} ready</Badge>
          <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="queue">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="queue" className="flex-1 gap-1.5">
              <Receipt className="w-4 h-4" /> Queue ({openSessions.length + unlinkedQueue.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History className="w-4 h-4" /> History ({closedSessions.length + billingHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {openSessions.length === 0 && unlinkedQueue.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No orders ready for billing</p>
                <p className="text-sm mt-1">Completed orders from kitchen will appear here</p>
              </div>
            )}

            {/* Session-based billing */}
            {openSessions.map(sg => {
              const pm = sessionPayment[sg.session.id];
              return (
                <div key={sg.session.id} className="bg-card rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">Table {sg.session.table_number}</span>
                      <Badge variant="outline" className="text-xs">{sg.orders.length} order(s)</Badge>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">Ready</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    {sg.orders.flatMap(o => o.items.filter(i => (i as any).status !== 'rejected')).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.item_name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(sg.total)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant={pm === 'cash' ? 'default' : 'outline'} onClick={() => setSessionPayment(p => ({ ...p, [sg.session.id]: 'cash' }))} className="flex-1">
                      <Banknote className="w-4 h-4 mr-1" /> Cash
                    </Button>
                    <Button size="sm" variant={pm === 'card' ? 'default' : 'outline'} onClick={() => setSessionPayment(p => ({ ...p, [sg.session.id]: 'card' }))} className="flex-1">
                      <CreditCard className="w-4 h-4 mr-1" /> Card
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handlePrintSession(sg)}>
                      <Printer className="w-4 h-4 mr-1" /> Print Bill
                    </Button>
                    <Button className="flex-1" onClick={() => closeSession(sg.session.id, pm || 'cash')} disabled={!pm}>
                      Mark Paid
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Legacy unlinked orders */}
            {unlinkedQueue.map(order => {
              const editing = editingCustomer[order.id];
              return (
                <div key={order.id} className="bg-card rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Table {order.table_number}</span>
                    <Badge className="bg-primary/10 text-primary border-0">Ready</Badge>
                  </div>

                  {editing ? (
                    <div className="flex gap-2">
                      <Input placeholder="Name" value={editing.name} onChange={e => setEditingCustomer(prev => ({ ...prev, [order.id]: { ...prev[order.id], name: e.target.value } }))} className="text-sm" />
                      <Input placeholder="Phone" value={editing.phone} onChange={e => setEditingCustomer(prev => ({ ...prev, [order.id]: { ...prev[order.id], phone: e.target.value } }))} className="text-sm" />
                      <Button size="sm" onClick={() => saveCustomer(order.id)}>Save</Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => startEditCustomer(order.id, order.customer_name || '', order.customer_phone || '')}
                    >
                      <span>{order.customer_name || 'Guest'}</span>
                      {order.customer_phone && <span>• {order.customer_phone}</span>}
                      <span className="text-xs underline ml-1">(edit)</span>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.item_name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant={order.payment_method === 'cash' ? 'default' : 'outline'} onClick={() => updateOrderPayment(order.id, 'cash')} className="flex-1">
                      <Banknote className="w-4 h-4 mr-1" /> Cash
                    </Button>
                    <Button size="sm" variant={order.payment_method === 'card' ? 'default' : 'outline'} onClick={() => updateOrderPayment(order.id, 'card')} className="flex-1">
                      <CreditCard className="w-4 h-4 mr-1" /> Card
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handlePrint(order)}>
                      <Printer className="w-4 h-4 mr-1" /> Print Bill
                    </Button>
                    <Button className="flex-1" onClick={() => updateOrderStatus(order.id, 'billed')}>
                      Mark Billed
                    </Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {closedSessions.length === 0 && billingHistory.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No billing history yet</p>
                <p className="text-sm mt-1">Billed orders will appear here</p>
              </div>
            )}

            {closedSessions.map(sg => (
              <div key={sg.session.id} className="bg-card rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Table {sg.session.table_number}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{sg.orders.length} order(s)</Badge>
                    <Badge variant="secondary">Paid</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(sg.session.closed_at)}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(sg.total)}</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => handlePrintSession(sg)}>
                  <Printer className="w-4 h-4 mr-1" /> Reprint Bill
                </Button>
              </div>
            ))}

            {billingHistory.map(order => (
              <div key={order.id} className="bg-card rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Table {order.table_number}</span>
                  <div className="flex items-center gap-2">
                    {order.payment_method && (
                      <Badge variant="outline" className="capitalize gap-1">
                        {order.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {order.payment_method}
                      </Badge>
                    )}
                    <Badge variant="secondary">Paid</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(order.billed_at)}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => handlePrint(order)}>
                  <Printer className="w-4 h-4 mr-1" /> Reprint Bill
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BillingDashboard;
