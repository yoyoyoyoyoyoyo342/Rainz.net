-- Create user_inventory table for shop purchases (streak freezes, etc.)
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type)
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Users can view their own inventory
CREATE POLICY "Users can view their own inventory" 
ON public.user_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own inventory
CREATE POLICY "Users can insert their own inventory" 
ON public.user_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own inventory
CREATE POLICY "Users can update their own inventory" 
ON public.user_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create shop_purchases table for purchase history
CREATE TABLE public.shop_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases" 
ON public.shop_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can insert their own purchases" 
ON public.shop_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create premium_trials table for tracking Rainz+ trial periods from shop
CREATE TABLE public.premium_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT NOT NULL DEFAULT 'shop',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_trials ENABLE ROW LEVEL SECURITY;

-- Users can view their own trials
CREATE POLICY "Users can view their own trials" 
ON public.premium_trials 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own trials
CREATE POLICY "Users can insert their own trials" 
ON public.premium_trials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add streak_freezes_used column to user_streaks for tracking automatic usage
ALTER TABLE public.user_streaks 
ADD COLUMN IF NOT EXISTS streak_freezes_used INTEGER DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_user_inventory_updated_at
BEFORE UPDATE ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();