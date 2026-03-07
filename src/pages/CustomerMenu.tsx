import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurant } from '@/context/RestaurantContext';
import { MENU_CATEGORIES, MenuCategory, formatCurrency } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, UtensilsCrossed, Loader2, AlertTriangle, Clock, ChefHat, CircleCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'quickbite_customer';

interface TrackedItem {
  item_name: string;
  status: string;
  quantity: number;
}

const CustomerMenu = () => {
  const { tableNumber: paramTableNumber } = useParams<{ slug?: string; restaurantId?: string; tableNumber: string }>();
  const table = parseInt(paramTableNumber || '1');
  const { toast } = useToast();
  const {
    restaurantName, menuItems, cart, cartTotal, cartCount, loadingMenu,
    addToCart, removeFromCart, updateCartQuantity, updateCartItemNote, placeOrder,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'All'>('All');
  const [showLogin, setShowLogin] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Date.now() - data.savedAt < 30 * 24 * 60 * 60 * 1000) {
          setCustomerName(data.name || '');
          setCustomerPhone(data.phone || '');
          return;
        }
      }
    } catch { /* ignore */ }
    setShowLogin(true);
  }, []);

  // Poll for order item statuses after order placed
  useEffect(() => {
    if (!lastOrderId || !orderPlaced) return;

    const poll = async () => {
      const { data } = await supabase
        .from('order_items')
        .select('item_name, status, quantity')
        .eq('order_id', lastOrderId) as any;
      if (data) setTrackedItems(data);
    };

    poll(); // immediate
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [lastOrderId, orderPlaced]);

  const handleSaveCustomer = () => {
    if (customerName || customerPhone) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: customerName, phone: customerPhone, savedAt: Date.now() }));
    }
    setShowLogin(false);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const orderId = await placeOrder(table, customerName, customerPhone, notes || undefined);
      if (orderId) {
        setLastOrderId(orderId);
        setTrackedItems([]);
        setOrderPlaced(true);
        setShowCart(false);
        setNotes('');
        // Try to fetch order_number (may need a moment for trigger)
        setTimeout(async () => {
          const { data } = await supabase
            .from('orders')
            .select('order_number')
            .eq('id', orderId)
            .maybeSingle() as any;
          if (data?.order_number) setOrderNumber(data.order_number);
        }, 500);
      } else {
        toast({ title: 'Order failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('[handlePlaceOrder] error:', err);
      toast({ title: 'Order failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setPlacing(false);
    }
  };

  const filteredItems = menuItems.filter(mi => mi.available && (selectedCategory === 'All' || mi.category === selectedCategory));

  if (loadingMenu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Clock className="w-4 h-4 text-primary" />;
      case 'preparing': return <ChefHat className="w-4 h-4 text-yellow-600" />;
      case 'ready': return <CircleCheck className="w-4 h-4 text-green-600" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting';
      case 'accepted': return 'Accepted';
      case 'preparing': return 'Being prepared';
      case 'ready': return 'Ready!';
      case 'rejected': return 'Unavailable';
      default: return status;
    }
  };

  if (orderPlaced) {
    const rejectedItems = trackedItems.filter(i => i.status === 'rejected');
    const hasRejected = rejectedItems.length > 0;
    const allReady = trackedItems.length > 0 && trackedItems.filter(i => i.status !== 'rejected').every(i => i.status === 'ready');

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-sm w-full">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${allReady ? 'bg-green-500/10' : 'bg-primary/10'}`}>
            {allReady ? <CircleCheck className="w-10 h-10 text-green-600" /> : <CheckCircle className="w-10 h-10 text-primary" />}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {allReady ? 'Order Ready!' : 'Order Sent!'}
          </h1>
          {orderNumber && (
            <p className="text-3xl font-bold text-primary">Order #{orderNumber}</p>
          )}
          <p className="text-muted-foreground">Table {table}</p>

          {trackedItems.length > 0 && (
            <div className="bg-card border rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Order Status</p>
              {trackedItems.map((item, i) => (
                <div key={i} className={`flex items-center justify-between gap-2 text-sm ${item.status === 'rejected' ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className={item.status === 'rejected' ? 'line-through' : ''}>{item.quantity}× {item.item_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{getStatusLabel(item.status)}</span>
                </div>
              ))}
            </div>
          )}

          {hasRejected && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-semibold text-destructive text-sm">Some items are unavailable</span>
              </div>
            </div>
          )}

          <Button onClick={() => { setOrderPlaced(false); setLastOrderId(null); setTrackedItems([]); setOrderNumber(null); }} className="w-full mt-6">
            Order More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-bold text-foreground leading-tight">{restaurantName}</h1>
              <p className="text-xs text-muted-foreground">Table {table}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">{customerName || 'Guest'}</Badge>
        </div>
      </div>

      <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex gap-2 px-4 py-2 overflow-x-auto max-w-lg mx-auto scrollbar-hide">
          {(['All', ...MENU_CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as MenuCategory | 'All')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {filteredItems.map(item => {
          const inCart = cart.find(ci => ci.menuItem.id === item.id);
          return (
            <div key={item.id} className="flex items-center justify-between p-4 bg-card rounded-xl border">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="font-semibold text-card-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                <p className="font-bold text-primary mt-1">{formatCurrency(item.price)}</p>
              </div>
              {inCart ? (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, inCart.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center font-semibold text-sm">{inCart.quantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(item)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => addToCart(item)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t no-print">
          <Sheet open={showCart} onOpenChange={setShowCart}>
            <SheetTrigger asChild>
              <Button className="w-full max-w-lg mx-auto flex justify-between h-14 text-base" size="lg">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount} item{cartCount > 1 ? 's' : ''}
                </span>
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Your Order</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[50vh]">
                {cart.map(ci => (
                  <div key={ci.menuItem.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{ci.menuItem.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(ci.menuItem.price)} × {ci.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(ci.menuItem.price * ci.quantity)}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(ci.menuItem.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      placeholder="Special instructions (e.g. no onion)"
                      value={ci.note}
                      onChange={e => updateCartItemNote(ci.menuItem.id, e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-3">
                <Input placeholder="Any general notes? (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                </div>
                <Button className="w-full h-14 text-base" size="lg" onClick={handlePlaceOrder} disabled={placing}>
                  {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Order'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Quick Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name (optional)</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Your phone number" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLogin(false)}>Skip</Button>
              <Button className="flex-1" onClick={handleSaveCustomer}>Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerMenu;
