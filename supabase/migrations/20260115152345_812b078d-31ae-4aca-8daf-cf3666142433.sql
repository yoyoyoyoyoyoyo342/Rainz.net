-- Create prediction_leagues table for leagues/clubs
CREATE TABLE public.prediction_leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  created_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create league_members table
CREATE TABLE public.league_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.prediction_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Create league_invites table for join requests
CREATE TABLE public.league_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.prediction_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Enable RLS
ALTER TABLE public.prediction_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for prediction_leagues
CREATE POLICY "Anyone can view public leagues" ON public.prediction_leagues
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create leagues" ON public.prediction_leagues
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their leagues" ON public.prediction_leagues
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Owners can delete their leagues" ON public.prediction_leagues
  FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for league_members
CREATE POLICY "Anyone can view league members" ON public.league_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join leagues" ON public.league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners/admins can manage members" ON public.league_members
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.league_members lm 
      WHERE lm.league_id = league_members.league_id 
      AND lm.user_id = auth.uid() 
      AND lm.role IN ('owner', 'admin')
    )
  );

-- RLS policies for league_invites
CREATE POLICY "Users can view their invites" ON public.league_invites
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.league_members lm 
    WHERE lm.league_id = league_invites.league_id 
    AND lm.user_id = auth.uid() 
    AND lm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can request to join" ON public.league_invites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners/admins can update invites" ON public.league_invites
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.league_members lm 
    WHERE lm.league_id = league_invites.league_id 
    AND lm.user_id = auth.uid() 
    AND lm.role IN ('owner', 'admin')
  ));

-- Add league_id to prediction_battles for league battles
ALTER TABLE public.prediction_battles 
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES public.prediction_leagues(id) ON DELETE SET NULL;

-- Create index for faster league queries
CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON public.league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_battles_league ON public.prediction_battles(league_id);