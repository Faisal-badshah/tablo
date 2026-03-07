
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- orders
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;

CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Also allow anon to read orders (for customer menu to see their order status)
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT TO anon USING (true);

-- order_items
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can read order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can read order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Anyone can read order items" ON public.order_items FOR SELECT TO anon USING (true);

-- menu_items
DROP POLICY IF EXISTS "Anyone can read menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;

CREATE POLICY "Anyone can read menu items" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners can insert menu items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Owners can update menu items" ON public.menu_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Owners can delete menu items" ON public.menu_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

-- restaurant_tables
DROP POLICY IF EXISTS "Anyone can read tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can insert tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can update tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can delete tables" ON public.restaurant_tables;

CREATE POLICY "Anyone can read tables" ON public.restaurant_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners can insert tables" ON public.restaurant_tables FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Owners can update tables" ON public.restaurant_tables FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Owners can delete tables" ON public.restaurant_tables FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
