export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'billed' | 'archived';
export type StaffRole = 'owner' | 'kitchen' | 'billing' | 'super_admin';
export type MenuCategory = 'Appetizers' | 'Mains' | 'Desserts' | 'Drinks';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  description: string;
  available: boolean;
  restaurant_id?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  completedAt?: Date;
  billedAt?: Date;
  paymentMethod?: 'cash' | 'card';
  notes?: string;
  restaurant_id?: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: number;
  restaurant_id?: string;
}

export const MENU_CATEGORIES: MenuCategory[] = ['Appetizers', 'Mains', 'Desserts', 'Drinks'];

export const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
