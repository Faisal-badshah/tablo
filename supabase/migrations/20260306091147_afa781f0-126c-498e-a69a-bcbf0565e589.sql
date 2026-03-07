
-- TASK 1: Add status to order_items for item-level kitchen control
ALTER TABLE public.order_items ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Allow staff to UPDATE order_items (accept/reject items)
CREATE POLICY "order_items_update_staff" ON public.order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND o.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

-- TASK 2: Create table_sessions for running bill
CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id),
  table_number integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert sessions (anonymous customers create them)
CREATE POLICY "sessions_insert" ON public.table_sessions FOR INSERT WITH CHECK (true);

-- Anyone can read sessions (customers need to check for open session)
CREATE POLICY "sessions_select" ON public.table_sessions FOR SELECT USING (true);

-- Staff can update sessions (close them on billing)
CREATE POLICY "sessions_update_staff" ON public.table_sessions FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Link orders to sessions
ALTER TABLE public.orders ADD COLUMN session_id uuid REFERENCES public.table_sessions(id);

-- Enable realtime for item status changes and sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
END $$;
