
-- Create restaurants table
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text,
  owner_email text,
  owner_phone text,
  status text NOT NULL DEFAULT 'trial',
  trial_end_date timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Add restaurant_id to existing tables
ALTER TABLE public.menu_items ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.restaurant_tables ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anon read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
DROP POLICY IF EXISTS "Owners delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anon read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Staff read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can read menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can read tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can insert tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can delete tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can read menu items " ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items " ON public.menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items " ON public.menu_items;
DROP POLICY IF EXISTS "Owners can update menu items " ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can insert order items " ON public.order_items;
DROP POLICY IF EXISTS "Anyone can read order items " ON public.order_items;
DROP POLICY IF EXISTS "Staff can read order items " ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert orders " ON public.orders;
DROP POLICY IF EXISTS "Anyone can read orders " ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders " ON public.orders;
DROP POLICY IF EXISTS "Staff can read orders " ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders " ON public.orders;
DROP POLICY IF EXISTS "Anyone can read tables " ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can delete tables " ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can insert tables " ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can update tables " ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can manage roles " ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role " ON public.user_roles;

-- Recreate policies (PERMISSIVE)
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "orders_select_staff" ON public.orders FOR SELECT TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
CREATE POLICY "orders_update_staff" ON public.orders FOR UPDATE TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "orders_delete_owner" ON public.orders FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'owner'::app_role) AND restaurant_id = public.get_user_restaurant_id(auth.uid())
);

CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "menu_items_select" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_items_insert" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "menu_items_update" ON public.menu_items FOR UPDATE TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "menu_items_delete" ON public.menu_items FOR DELETE TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);

CREATE POLICY "tables_select" ON public.restaurant_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tables_insert" ON public.restaurant_tables FOR INSERT TO authenticated WITH CHECK (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "tables_update" ON public.restaurant_tables FOR UPDATE TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "tables_delete" ON public.restaurant_tables FOR DELETE TO authenticated USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
);

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles_manage" ON public.user_roles FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "restaurants_super_admin" ON public.restaurants FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);
CREATE POLICY "restaurants_owner_select" ON public.restaurants FOR SELECT TO authenticated USING (
  id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "restaurants_owner_update" ON public.restaurants FOR UPDATE TO authenticated USING (
  id = public.get_user_restaurant_id(auth.uid())
);
CREATE POLICY "restaurants_anon_select" ON public.restaurants FOR SELECT TO anon USING (
  status IN ('trial', 'active')
);
CREATE POLICY "restaurants_auth_insert" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
