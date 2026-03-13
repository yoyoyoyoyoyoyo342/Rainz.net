
-- Weekly recaps table for storing structured recap data
CREATE TABLE public.weekly_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  total_predictions integer NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  highlights jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recaps" ON public.weekly_recaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recaps" ON public.weekly_recaps
  FOR UPDATE USING (auth.uid() = user_id);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User follows table
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Saved routes table for DryRoutes history
CREATE TABLE public.saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Route',
  geometry jsonb NOT NULL,
  distance numeric NOT NULL DEFAULT 0,
  duration numeric NOT NULL DEFAULT 0,
  transport_mode text NOT NULL DEFAULT 'walking',
  elevation_gain numeric DEFAULT 0,
  avg_pace numeric DEFAULT 0,
  splits jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own routes" ON public.saved_routes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
