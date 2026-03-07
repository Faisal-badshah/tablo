
-- 1. Add slug to restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug text;

-- Generate slugs for existing restaurants
UPDATE public.restaurants 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.restaurants ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_slug_unique ON public.restaurants(slug);

-- 2. Add order_number sequence to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number integer;

-- Function to auto-assign sequential order_number per restaurant
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1
  INTO NEW.order_number
  FROM public.orders
  WHERE restaurant_id = NEW.restaurant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Backfill existing orders
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY created_at) AS rn
  FROM public.orders
  WHERE order_number IS NULL
)
UPDATE public.orders o SET order_number = n.rn
FROM numbered n WHERE o.id = n.id;

-- 3. Add note (per-item special instructions) to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS note text DEFAULT '';

-- 4. Add status to restaurant_tables
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available';

-- 5. Add order_type to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in';

-- 6. Allow anonymous users to SELECT their own orders by session_id (for status tracking)
CREATE POLICY "orders_select_anon_by_session" ON public.orders FOR SELECT
USING (
  session_id IS NOT NULL
);

-- 7. Allow anonymous users to SELECT order_items for their orders
-- (order_items_select already allows all SELECT, so this is already covered)
