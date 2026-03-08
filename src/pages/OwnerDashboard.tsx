import { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '@/context/RestaurantContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Settings, LogOut, Plus, Trash2, ShoppingBag, IndianRupee, TrendingUp, Users, Loader2, Download } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { formatCurrency, MENU_CATEGORIES, MenuCategory } from '../../supabase/types/restaurant';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
}

const TABLE_STATUSES = ['available', 'occupied', 'cleaning'] as const;

const OwnerDashboard = () => {
  const {
    restaurantName, restaurantSlug, restaurantId, menuItems, tables, orders,
    addMenuItem, updateMenuItem, deleteMenuItem, addTable, deleteTable, updateTableStatus,
  } = useRestaurant();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Mains' as MenuCategory, description: '' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', password: '', role: 'kitchen' });
  const [addingStaff, setAddingStaff] = useState(false);

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status === 'billed').reduce((s, o) => s + o.total_amount, 0);
  const avgOrderValue = todayOrders.length > 0 ? Math.round(todayOrders.reduce((s, o) => s + o.total_amount, 0) / todayOrders.length) : 0;

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'list' } });
    if (!error && data?.staff) setStaff(data.staff);
    setStaffLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password) return;
    setAddingStaff(true);
    const { data, error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'create', email: newStaff.email, password: newStaff.password, role: newStaff.role },
    });
    setAddingStaff(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Failed to create staff');
    } else {
      toast.success('Staff account created');
      setNewStaff({ email: '', password: '', role: 'kitchen' });
      setShowAddStaff(false);
      fetchStaff();
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'delete', user_id: userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Failed to delete staff');
    } else {
      toast.success('Staff account removed');
      fetchStaff();
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    addMenuItem({ name: newItem.name, price: parseInt(newItem.price), category: newItem.category, description: newItem.description, available: true });
    setNewItem({ name: '', price: '', category: 'Mains', description: '' });
    setShowAddItem(false);
  };

  const handleAddTable = async () => {
    const num = parseInt(newTableNumber);
    if (!num) { toast.error('Enter a valid table number'); return; }
    if (tables.some(t => t.table_number === num)) { toast.error(`Table ${num} already exists`); return; }
    try {
      await addTable(num);
      toast.success(`Table ${num} created`);
      setNewTableNumber('');
    } catch (err: any) {
      const msg = err?.message || 'Failed to create table';
      if (msg.includes('unique_table_per_restaurant')) {
        toast.error(`Table ${num} already exists`);
      } else {
        toast.error(msg);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/staff/login');
  };

  // Build QR URL based on slug availability
  const getQrUrl = (tableNum: number) => {
    if (restaurantSlug) {
      return `${window.location.origin}/r/${restaurantSlug}/t/${tableNum}`;
    }
    return `${window.location.origin}/order/${restaurantId}/${tableNum}`;
  };

  const getTableStatusBadge = (status: string) => {
    switch (status) {
      case 'occupied': return <Badge variant="destructive" className="text-xs">Occupied</Badge>;
      case 'cleaning': return <Badge className="bg-yellow-500/20 text-yellow-600 border-0 text-xs">Cleaning</Badge>;
      default: return <Badge className="bg-green-500/20 text-green-600 border-0 text-xs">Available</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{restaurantName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/kitchen"><Button variant="ghost" size="sm">Kitchen</Button></Link>
          <Link to="/billing"><Button variant="ghost" size="sm">Billing</Button></Link>
          <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center">
                <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{todayOrders.length}</p>
                <p className="text-xs text-muted-foreground">Orders Today</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <IndianRupee className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground">Avg Order</p>
              </CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Menu Items ({menuItems.length})</h2>
              <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Item</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Price (₹)</Label><Input type="number" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} /></div>
                    <div>
                      <Label>Category</Label>
                      <Select value={newItem.category} onValueChange={v => setNewItem(p => ({ ...p, category: v as MenuCategory }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MENU_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} /></div>
                    <Button className="w-full" onClick={handleAddItem}>Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {menuItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={item.available} onCheckedChange={v => updateMenuItem(item.id, { available: v })} />
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMenuItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tables" className="space-y-4 mt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Table Number</Label>
                <Input type="number" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} placeholder="e.g. 6" />
              </div>
              <Button onClick={handleAddTable}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {tables.map(table => {
                const tableStatus = (table as any).status || 'available';
                return (
                  <Card key={table.id}>
                    <CardContent className="p-4 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <p className="font-bold">Table {table.table_number}</p>
                        {getTableStatusBadge(tableStatus)}
                      </div>
                      <Select value={tableStatus} onValueChange={v => updateTableStatus(table.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLE_STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div id={`qr-table-${table.table_number}`} className="bg-card p-2 rounded-lg inline-block border">
                        <QRCodeSVG value={getQrUrl(table.table_number)} size={120} />
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        {restaurantSlug ? `/r/${restaurantSlug}/t/${table.table_number}` : `/order/${restaurantId}/${table.table_number}`}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" onClick={() => {
                          const svg = document.querySelector(`#qr-table-${table.table_number} svg`);
                          if (!svg) return;
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          canvas.width = 240; canvas.height = 240;
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            ctx?.drawImage(img, 0, 0, 240, 240);
                            const a = document.createElement('a');
                            a.download = `table-${table.table_number}-qr.png`;
                            a.href = canvas.toDataURL('image/png');
                            a.click();
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        }}>
                          <Download className="w-3 h-3 mr-1" /> QR
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTable(table.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Staff Accounts
              </h2>
              <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Staff</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Staff Account</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Email</Label><Input type="email" value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} placeholder="staff@restaurant.com" /></div>
                    <div><Label>Password</Label><Input type="password" value={newStaff.password} onChange={e => setNewStaff(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" /></div>
                    <div>
                      <Label>Role</Label>
                      <Select value={newStaff.role} onValueChange={v => setNewStaff(p => ({ ...p, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleAddStaff} disabled={addingStaff}>
                      {addingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {staffLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : staff.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No staff accounts found.</p>
            ) : (
              staff.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                  <div>
                    <p className="font-medium">{s.email}</p>
                    <Badge variant="outline" className="text-xs capitalize">{s.role}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteStaff(s.user_id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-3 mt-4">
            {orders.length === 0 && <p className="text-center py-10 text-muted-foreground">No orders yet.</p>}
            {orders.map(order => (
              <div key={order.id} className="p-3 bg-card rounded-lg border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {(order as any).order_number && (
                      <span className="font-mono text-xs text-muted-foreground">#{(order as any).order_number}</span>
                    )}
                    <span className="font-medium">Table {order.table_number}</span>
                    <Badge variant={
                      order.status === 'billed' ? 'secondary' :
                      order.status === 'completed' ? 'default' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customer_name || 'Guest'} • {order.items.length} items</p>
                </div>
                <span className="font-bold">{formatCurrency(order.total_amount)}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OwnerDashboard;
