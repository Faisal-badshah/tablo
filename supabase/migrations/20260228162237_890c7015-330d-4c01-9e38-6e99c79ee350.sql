
-- Role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'kitchen', 'billing');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is any staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'Mains',
  description TEXT DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read menu items
CREATE POLICY "Anyone can read menu items" ON public.menu_items
  FOR SELECT USING (true);
CREATE POLICY "Owners can insert menu items" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update menu items" ON public.menu_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete menu items" ON public.menu_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Restaurant tables
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tables" ON public.restaurant_tables
  FOR SELECT USING (true);
CREATE POLICY "Owners can insert tables" ON public.restaurant_tables
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update tables" ON public.restaurant_tables
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete tables" ON public.restaurant_tables
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'billed', 'archived')),
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  billed_at TIMESTAMPTZ
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert orders (customers are anonymous)
CREATE POLICY "Anyone can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);
-- Staff can read orders
CREATE POLICY "Staff can read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
-- Staff can update orders based on role
CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
-- Owners can delete orders
CREATE POLICY "Owners can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Anyone can insert order items (part of placing an order)
CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);
-- Staff can read order items
CREATE POLICY "Staff can read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- User roles policies
CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Enable realtime on orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Seed menu items
INSERT INTO public.menu_items (name, price, category, description) VALUES
  ('Paneer Tikka', 250, 'Appetizers', 'Grilled cottage cheese with aromatic spices'),
  ('Butter Chicken', 300, 'Mains', 'Creamy tomato curry with tender chicken'),
  ('Naan', 50, 'Mains', 'Fresh tandoor-baked bread'),
  ('Steamed Rice', 100, 'Mains', 'Fluffy basmati rice'),
  ('Coke', 40, 'Drinks', 'Chilled cola 330ml'),
  ('Mango Lassi', 60, 'Drinks', 'Sweet mango yogurt drink'),
  ('Gulab Jamun', 80, 'Desserts', 'Sweet milk dumplings in rose syrup');

-- Seed tables
INSERT INTO public.restaurant_tables (table_number) VALUES (1), (2), (3), (4), (5);
