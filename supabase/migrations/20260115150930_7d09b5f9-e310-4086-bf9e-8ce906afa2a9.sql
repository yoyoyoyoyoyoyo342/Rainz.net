-- Create table to track active powerups (double points, prediction shield, etc.)
CREATE TABLE public.active_powerups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  powerup_type TEXT NOT NULL, -- 'double_points', 'prediction_shield'
  uses_remaining INTEGER DEFAULT NULL, -- for shields (3 uses), null for time-based
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- for time-based powerups
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_powerups ENABLE ROW LEVEL SECURITY;

-- Users can view their own powerups
CREATE POLICY "Users can view their own powerups" 
ON public.active_powerups 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own powerups
CREATE POLICY "Users can insert their own powerups" 
ON public.active_powerups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own powerups
CREATE POLICY "Users can update their own powerups" 
ON public.active_powerups 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own powerups
CREATE POLICY "Users can delete their own powerups" 
ON public.active_powerups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_active_powerups_user_id ON public.active_powerups(user_id);
CREATE INDEX idx_active_powerups_type ON public.active_powerups(powerup_type);

-- Create table for daily spin tracking
CREATE TABLE public.daily_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_type TEXT NOT NULL,
  reward_amount INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

-- Enable RLS
ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

-- Users can view their own spins
CREATE POLICY "Users can view their own spins" 
ON public.daily_spins 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own spins
CREATE POLICY "Users can insert their own spins" 
ON public.daily_spins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Index for faster date lookups
CREATE INDEX idx_daily_spins_user_date ON public.daily_spins(user_id, spin_date);

-- Create table for tip jar tracking
CREATE TABLE public.tip_jar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL, -- null for anonymous tips
  amount_cents INTEGER NOT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tip_jar ENABLE ROW LEVEL SECURITY;

-- Anyone can view tips (for goal progress)
CREATE POLICY "Anyone can view tips" 
ON public.tip_jar 
FOR SELECT 
USING (true);

-- Authenticated users can insert tips
CREATE POLICY "Authenticated users can insert tips" 
ON public.tip_jar 
FOR INSERT 
WITH CHECK (true);