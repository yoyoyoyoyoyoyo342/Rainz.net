
-- Weather photo challenge submissions
CREATE TABLE public.weather_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  location_name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  weather_condition text,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  photo_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.weather_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view photos" ON public.weather_photos FOR SELECT USING (true);
CREATE POLICY "Users can upload their own photos" ON public.weather_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.weather_photos FOR DELETE USING (auth.uid() = user_id);

-- Photo votes
CREATE TABLE public.weather_photo_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.weather_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

ALTER TABLE public.weather_photo_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view photo votes" ON public.weather_photo_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote on photos" ON public.weather_photo_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove photo vote" ON public.weather_photo_votes FOR DELETE USING (auth.uid() = user_id);

-- Sync vote count trigger
CREATE OR REPLACE FUNCTION public.sync_photo_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.weather_photos SET vote_count = vote_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.weather_photos SET vote_count = GREATEST(0, vote_count - 1) WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_photo_vote_change
AFTER INSERT OR DELETE ON public.weather_photo_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_photo_vote_count();

-- Weather debate arena (wagers)
CREATE TABLE public.weather_debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL DEFAULT 'Yes',
  option_b text NOT NULL DEFAULT 'No',
  wager_points integer NOT NULL DEFAULT 10,
  resolution_date date NOT NULL,
  resolved_option text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  location_name text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debates" ON public.weather_debates FOR SELECT USING (true);
CREATE POLICY "Users can create debates" ON public.weather_debates FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their debates" ON public.weather_debates FOR UPDATE USING (auth.uid() = creator_id);

-- Debate bets
CREATE TABLE public.weather_debate_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.weather_debates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chosen_option text NOT NULL,
  points_wagered integer NOT NULL DEFAULT 10,
  points_won integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(debate_id, user_id)
);

ALTER TABLE public.weather_debate_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debate bets" ON public.weather_debate_bets FOR SELECT USING (true);
CREATE POLICY "Users can place debate bets" ON public.weather_debate_bets FOR INSERT WITH CHECK (auth.uid() = user_id);
