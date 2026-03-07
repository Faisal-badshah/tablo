-- Remove the overly broad select policy - staff already have scoped select, 
-- and customers will use session-based polling via order_items which already has open SELECT
DROP POLICY IF EXISTS "orders_select_anon_by_session" ON public.orders;