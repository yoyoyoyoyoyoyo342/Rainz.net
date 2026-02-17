
-- Weather Reactions table for live social feed
CREATE TABLE public.weather_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  display_name text,
  emoji text NOT NULL,
  message text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  location_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recent reactions"
  ON public.weather_reactions FOR SELECT
  USING (created_at > now() - interval '24 hours');

CREATE POLICY "Authenticated users can post reactions"
  ON public.weather_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.weather_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for geo-based queries
CREATE INDEX idx_weather_reactions_location ON public.weather_reactions (latitude, longitude);
CREATE INDEX idx_weather_reactions_created ON public.weather_reactions (created_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_reactions;

-- Streak Challenges tables
CREATE TABLE public.streak_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id uuid NOT NULL,
  opponent_id uuid,
  location_name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'pending',
  winner_id uuid,
  invite_code text DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.streak_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their challenges"
  ON public.streak_challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Authenticated users can view pending challenges by invite code"
  ON public.streak_challenges FOR SELECT
  USING (status = 'pending');

CREATE POLICY "Users can create challenges"
  ON public.streak_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update their challenges"
  ON public.streak_challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE TABLE public.streak_challenge_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.streak_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_number integer NOT NULL,
  prediction_id uuid REFERENCES public.weather_predictions(id),
  accuracy_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.streak_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view challenge progress"
  ON public.streak_challenge_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.streak_challenges sc
    WHERE sc.id = challenge_id
    AND (sc.challenger_id = auth.uid() OR sc.opponent_id = auth.uid())
  ));

CREATE POLICY "Users can insert their own progress"
  ON public.streak_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_streak_challenges_status ON public.streak_challenges (status);
CREATE INDEX idx_streak_challenge_progress_challenge ON public.streak_challenge_progress (challenge_id);
