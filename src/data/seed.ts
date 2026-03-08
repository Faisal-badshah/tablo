import { MenuItem, RestaurantTable } from '../../supabase/types/restaurant';

export const RESTAURANT_NAME = 'The Spice House';

export const seedMenuItems: MenuItem[] = [
  { id: '1', name: 'Paneer Tikka', price: 250, category: 'Appetizers', description: 'Grilled cottage cheese with aromatic spices', available: true },
  { id: '2', name: 'Butter Chicken', price: 300, category: 'Mains', description: 'Creamy tomato curry with tender chicken', available: true },
  { id: '3', name: 'Naan', price: 50, category: 'Mains', description: 'Fresh tandoor-baked bread', available: true },
  { id: '4', name: 'Steamed Rice', price: 100, category: 'Mains', description: 'Fluffy basmati rice', available: true },
  { id: '5', name: 'Coke', price: 40, category: 'Drinks', description: 'Chilled cola 330ml', available: true },
  { id: '6', name: 'Mango Lassi', price: 60, category: 'Drinks', description: 'Sweet mango yogurt drink', available: true },
  { id: '7', name: 'Gulab Jamun', price: 80, category: 'Desserts', description: 'Sweet milk dumplings in rose syrup', available: true },
];

export const seedTables: RestaurantTable[] = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i + 1}`,
  tableNumber: i + 1,
}));
