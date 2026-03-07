import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<'menu_items'>;
type OrderRow = Tables<'orders'>;
type OrderItemRow = Tables<'order_items'>;
type RestaurantTable = Tables<'restaurant_tables'>;

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

export interface Order extends OrderRow {
  items: OrderItemRow[];
}

export interface TableSession {
  id: string;
  restaurant_id: string | null;
  table_number: number;
  status: string;
  created_at: string;
  closed_at: string | null;
}

interface RestaurantContextType {
  restaurantName: string;
  restaurantSlug: string | null;
  restaurantId: string | null;
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  sessions: TableSession[];
  cart: CartItem[];
  cartTotal: number;
  cartCount: number;
  loadingMenu: boolean;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, qty: number) => void;
  updateCartItemNote: (itemId: string, note: string) => void;
  clearCart: () => void;
  placeOrder: (tableNumber: number, customerName: string, customerPhone: string, notes?: string) => Promise<string | null>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  updateOrderItemStatus: (itemId: string, status: string, orderId: string) => Promise<void>;
  updateOrderCustomer: (orderId: string, name: string, phone: string) => Promise<void>;
  updateOrderPayment: (orderId: string, method: 'cash' | 'card') => Promise<void>;
  closeSession: (sessionId: string, paymentMethod: 'cash' | 'card') => Promise<void>;
  addMenuItem: (item: { name: string; price: number; category: string; description: string; available: boolean }) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addTable: (tableNumber: number) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  updateTableStatus: (id: string, status: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('Must be inside RestaurantProvider');
  return ctx;
};

interface ProviderProps {
  children: ReactNode;
  restaurantId?: string | null;
  slug?: string | null;
  tableNumber?: string;
}

export const RestaurantProvider = ({ children, restaurantId: propRestaurantId, slug, tableNumber }: ProviderProps) => {
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(slug || null);
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<string | null>(propRestaurantId || null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const restaurantId = resolvedRestaurantId;

  // Resolve restaurant by slug or ID
  useEffect(() => {
    const resolve = async () => {
      if (slug) {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name, slug')
          .eq('slug', slug)
          .maybeSingle();
        if (data) {
          setResolvedRestaurantId(data.id);
          setRestaurantName(data.name);
          setRestaurantSlug((data as any).slug);
        } else {
          setRestaurantName('Restaurant Not Found');
        }
      } else if (propRestaurantId) {
        setResolvedRestaurantId(propRestaurantId);
        const { data } = await supabase
          .from('restaurants')
          .select('name, slug')
          .eq('id', propRestaurantId)
          .maybeSingle();
        if (data) {
          setRestaurantName(data.name);
          setRestaurantSlug((data as any).slug);
        }
      } else {
        setRestaurantName('Restaurant');
      }
    };
    resolve();
  }, [slug, propRestaurantId]);

  // Fetch menu items
  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) { setLoadingMenu(false); return; }
      const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category');
      if (data) setMenuItems(data);
      setLoadingMenu(false);
    };
    fetchMenu();
  }, [restaurantId]);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      if (!restaurantId) return;
      const { data } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', restaurantId).order('table_number');
      if (data) setTables(data);
    };
    fetchTables();
  }, [restaurantId]);

  // Fetch sessions
  const refreshSessions = useCallback(async () => {
    if (!restaurantId) { setSessions([]); return; }
    const { data } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }) as any;
    if (data) setSessions(data);
  }, [restaurantId]);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  // Fetch orders with items
  const refreshOrders = useCallback(async () => {
    if (!restaurantId) { setOrders([]); return; }
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .not('status', 'eq', 'archived')
      .order('created_at', { ascending: false });

    if (!ordersData) { setOrders([]); return; }

    const orderIds = ordersData.map(o => o.id);
    if (orderIds.length === 0) { setOrders([]); return; }

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    const itemsByOrder = (itemsData || []).reduce<Record<string, OrderItemRow[]>>((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    setOrders(ordersData.map(o => ({ ...o, items: itemsByOrder[o.id] || [] })));
  }, [restaurantId]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => refreshOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => refreshSessions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshOrders, refreshSessions, restaurantId]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  const cartTotal = useMemo(() => cart.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, ci) => s + ci.quantity, 0), [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItem.id === item.id);
      if (existing) return prev.map(ci => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      return [...prev, { menuItem: item, quantity: 1, note: '' }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(ci => ci.menuItem.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(ci => ci.menuItem.id !== itemId)); return; }
    setCart(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, quantity: qty } : ci));
  }, []);

  const updateCartItemNote = useCallback((itemId: string, note: string) => {
    setCart(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, note } : ci));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const placeOrder = useCallback(async (tableNumber: number, customerName: string, customerPhone: string, notes?: string) => {
    const totalAmount = cart.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0);
    const orderId = crypto.randomUUID();

    console.log('[placeOrder] restaurant_id:', restaurantId, 'table:', tableNumber, 'items:', cart.length, 'total:', totalAmount);

    // Find or create a session for this table
    let sessionId: string | null = null;
    if (restaurantId) {
      const { data: existingSession } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .eq('status', 'open')
        .maybeSingle() as any;

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const newSessionId = crypto.randomUUID();
        const { error: sessionError } = await supabase
          .from('table_sessions')
          .insert({ id: newSessionId, restaurant_id: restaurantId, table_number: tableNumber, status: 'open' } as any);
        if (!sessionError) sessionId = newSessionId;
      }
    }

    const insertData: Record<string, unknown> = {
      id: orderId,
      table_number: tableNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      total_amount: totalAmount,
      notes: notes || '',
      status: 'pending',
      order_type: 'dine_in',
    };
    if (restaurantId) insertData.restaurant_id = restaurantId;
    if (sessionId) insertData.session_id = sessionId;

    const { error: orderError } = await supabase
      .from('orders')
      .insert(insertData as any);

    if (orderError) {
      console.error('[placeOrder] order insert failed:', orderError);
      return null;
    }

    const orderItems = cart.map(ci => ({
      order_id: orderId,
      item_name: ci.menuItem.name,
      quantity: ci.quantity,
      price: ci.menuItem.price,
      status: 'pending',
      note: ci.note || '',
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems as any);
    if (itemsError) {
      console.error('[placeOrder] order_items insert failed:', itemsError);
      return null;
    }

    console.log('[placeOrder] success, orderId:', orderId, 'sessionId:', sessionId);
    setCart([]);
    return orderId;
  }, [cart, restaurantId]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'billed') updates.billed_at = new Date().toISOString();
    await supabase.from('orders').update(updates).eq('id', orderId);
  }, []);

  const updateOrderItemStatus = useCallback(async (itemId: string, status: string, orderId: string) => {
    await supabase.from('order_items').update({ status } as any).eq('id', itemId);

    // After updating, check all items for this order to derive order status
    const { data: allItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId) as any;

    if (!allItems) return;

    const allDecided = allItems.every((i: any) => i.status !== 'pending');
    if (!allDecided) return;

    const hasAccepted = allItems.some((i: any) => i.status === 'accepted' || i.status === 'preparing' || i.status === 'ready');
    const allRejected = allItems.every((i: any) => i.status === 'rejected');
    const allReady = allItems.filter((i: any) => i.status !== 'rejected').every((i: any) => i.status === 'ready');

    let newStatus: string;
    if (allRejected) {
      newStatus = 'rejected';
    } else if (allReady) {
      newStatus = 'completed';
    } else {
      newStatus = 'in_progress';
    }

    // Recalculate total based on non-rejected items
    const activeItems = allItems.filter((i: any) => i.status !== 'rejected');
    const newTotal = activeItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    await supabase.from('orders').update({
      status: newStatus,
      total_amount: newTotal,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', orderId);
  }, []);

  const updateOrderCustomer = useCallback(async (orderId: string, name: string, phone: string) => {
    await supabase.from('orders').update({ customer_name: name, customer_phone: phone }).eq('id', orderId);
  }, []);

  const updateOrderPayment = useCallback(async (orderId: string, method: 'cash' | 'card') => {
    await supabase.from('orders').update({ payment_method: method }).eq('id', orderId);
  }, []);

  const closeSession = useCallback(async (sessionId: string, paymentMethod: 'cash' | 'card') => {
    const sessionOrders = orders.filter(o => (o as any).session_id === sessionId);
    const now = new Date().toISOString();
    for (const order of sessionOrders) {
      if (order.status !== 'billed' && order.status !== 'rejected') {
        await supabase.from('orders').update({
          status: 'billed',
          billed_at: now,
          payment_method: paymentMethod,
        }).eq('id', order.id);
      }
    }
    await supabase.from('table_sessions').update({
      status: 'closed',
      closed_at: now,
    } as any).eq('id', sessionId);
  }, [orders]);

  const addMenuItem = useCallback(async (item: { name: string; price: number; category: string; description: string; available: boolean }) => {
    const insertData: Record<string, unknown> = { ...item };
    if (restaurantId) insertData.restaurant_id = restaurantId;
    const { data } = await supabase.from('menu_items').insert(insertData as any).select().single();
    if (data) setMenuItems(prev => [...prev, data]);
  }, [restaurantId]);

  const updateMenuItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    await supabase.from('menu_items').update(updates).eq('id', id);
    setMenuItems(prev => prev.map(mi => mi.id === id ? { ...mi, ...updates } : mi));
  }, []);

  const deleteMenuItem = useCallback(async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    setMenuItems(prev => prev.filter(mi => mi.id !== id));
  }, []);

  const addTable = useCallback(async (tableNumber: number) => {
    const insertData: Record<string, unknown> = { table_number: tableNumber, status: 'available' };
    if (restaurantId) insertData.restaurant_id = restaurantId;
    const { data, error } = await supabase.from('restaurant_tables').insert(insertData as any).select().single();
    if (error) throw error;
    if (data) setTables(prev => [...prev, data]);
  }, [restaurantId]);

  const deleteTable = useCallback(async (id: string) => {
    await supabase.from('restaurant_tables').delete().eq('id', id);
    setTables(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTableStatus = useCallback(async (id: string, status: string) => {
    await supabase.from('restaurant_tables').update({ status } as any).eq('id', id);
    setTables(prev => prev.map(t => t.id === id ? { ...t, status } as any : t));
  }, []);

  const value = useMemo(() => ({
    restaurantName, restaurantSlug, restaurantId: restaurantId ?? null, menuItems, tables, orders, sessions, cart, cartTotal, cartCount, loadingMenu,
    addToCart, removeFromCart, updateCartQuantity, updateCartItemNote, clearCart, placeOrder,
    updateOrderStatus, updateOrderItemStatus, updateOrderCustomer, updateOrderPayment, closeSession,
    addMenuItem, updateMenuItem, deleteMenuItem, addTable, deleteTable, updateTableStatus, refreshOrders,
  }), [restaurantName, restaurantSlug, restaurantId, menuItems, tables, orders, sessions, cart, cartTotal, cartCount, loadingMenu,
    addToCart, removeFromCart, updateCartQuantity, updateCartItemNote, clearCart, placeOrder,
    updateOrderStatus, updateOrderItemStatus, updateOrderCustomer, updateOrderPayment, closeSession,
    addMenuItem, updateMenuItem, deleteMenuItem, addTable, deleteTable, updateTableStatus, refreshOrders]);

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};
