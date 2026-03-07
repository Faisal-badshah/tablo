-- 1. Drop the old incorrect unique constraint on just table_number
ALTER TABLE public.restaurant_tables
DROP CONSTRAINT IF EXISTS restaurant_tables_table_number_key;

-- 2. Ensure composite unique constraint exists (restaurant_id, table_number)
-- Drop if exists to avoid error, then recreate
ALTER TABLE public.restaurant_tables
DROP CONSTRAINT IF EXISTS unique_table_per_restaurant;

ALTER TABLE public.restaurant_tables ADD CONSTRAINT unique_table_per_restaurant UNIQUE (restaurant_id, table_number);