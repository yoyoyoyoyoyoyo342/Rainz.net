-- Add shop_points column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shop_points INTEGER NOT NULL DEFAULT 0;

-- Add comment to clarify the difference
COMMENT ON COLUMN public.profiles.shop_points IS 'Shop Points (SP) - used for purchasing items in the shop. Can be converted from prediction points or bought with real money.';