-- Create Christmas Calendar table
CREATE TABLE public.christmas_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 25),
  reward_type TEXT NOT NULL,
  reward_amount INT NOT NULL DEFAULT 1,
  unlock_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, day_number)
);

-- Create Christmas Claims table
CREATE TABLE public.christmas_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id UUID NOT NULL REFERENCES public.christmas_calendar(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Create Ramadan Calendar table
CREATE TABLE public.ramadan_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  reward_type TEXT NOT NULL,
  reward_amount INT NOT NULL DEFAULT 1,
  gregorian_start_date DATE NOT NULL,
  gregorian_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, day_number)
);

-- Create Ramadan Claims table
CREATE TABLE public.ramadan_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id UUID NOT NULL REFERENCES public.ramadan_calendar(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_latitude FLOAT,
  user_longitude FLOAT,
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS on all calendar tables
ALTER TABLE public.christmas_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramadan_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramadan_claims ENABLE ROW LEVEL SECURITY;

-- Christmas Calendar policies (everyone can view)
CREATE POLICY "Christmas calendar is viewable by everyone" 
ON public.christmas_calendar 
FOR SELECT 
USING (true);

-- Christmas Claims policies
CREATE POLICY "Users can view their own christmas claims" 
ON public.christmas_claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own christmas claims" 
ON public.christmas_claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ramadan Calendar policies (everyone can view)
CREATE POLICY "Ramadan calendar is viewable by everyone" 
ON public.ramadan_calendar 
FOR SELECT 
USING (true);

-- Ramadan Claims policies
CREATE POLICY "Users can view their own ramadan claims" 
ON public.ramadan_claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ramadan claims" 
ON public.ramadan_claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Seed Christmas Calendar 2025 data (Dec 1-25)
INSERT INTO public.christmas_calendar (year, day_number, reward_type, reward_amount, unlock_date)
SELECT 
  2025,
  day_num,
  CASE 
    WHEN day_num IN (1, 8, 15, 22) THEN 'shop_points'
    WHEN day_num IN (2, 9, 16, 23) THEN 'prediction_points'
    WHEN day_num IN (3, 10, 17, 24) THEN 'streak_freeze'
    WHEN day_num IN (4, 11, 18) THEN 'double_points'
    WHEN day_num IN (5, 12, 19) THEN 'mystery_box'
    WHEN day_num IN (6, 13, 20) THEN 'xp_boost'
    WHEN day_num IN (7, 14, 21) THEN 'shop_points'
    WHEN day_num = 25 THEN 'mystery_box'
    ELSE 'shop_points'
  END,
  CASE 
    WHEN day_num IN (1, 8, 15, 22) THEN 50
    WHEN day_num IN (2, 9, 16, 23) THEN 100
    WHEN day_num IN (3, 10, 17, 24) THEN 1
    WHEN day_num IN (4, 11, 18) THEN 1
    WHEN day_num IN (5, 12, 19) THEN 1
    WHEN day_num IN (6, 13, 20) THEN 1
    WHEN day_num IN (7, 14, 21) THEN 75
    WHEN day_num = 25 THEN 3
    ELSE 25
  END,
  ('2025-12-01'::date + (day_num - 1) * INTERVAL '1 day')::date
FROM generate_series(1, 25) AS day_num;

-- Seed Ramadan Calendar 2026 data (approximately Feb 28 - Mar 29, 2026)
-- Note: Actual dates should be verified closer to Ramadan
INSERT INTO public.ramadan_calendar (year, day_number, reward_type, reward_amount, gregorian_start_date, gregorian_end_date)
SELECT 
  2026,
  day_num,
  CASE 
    WHEN day_num IN (1, 8, 15, 22, 29) THEN 'shop_points'
    WHEN day_num IN (2, 9, 16, 23, 30) THEN 'prediction_points'
    WHEN day_num IN (3, 10, 17, 24) THEN 'streak_freeze'
    WHEN day_num IN (4, 11, 18, 25) THEN 'double_points'
    WHEN day_num IN (5, 12, 19, 26) THEN 'mystery_box'
    WHEN day_num IN (6, 13, 20, 27) THEN 'xp_boost'
    WHEN day_num IN (7, 14, 21, 28) THEN 'shop_points'
    ELSE 'shop_points'
  END,
  CASE 
    WHEN day_num IN (1, 8, 15, 22, 29) THEN 50
    WHEN day_num IN (2, 9, 16, 23, 30) THEN 100
    WHEN day_num IN (3, 10, 17, 24) THEN 1
    WHEN day_num IN (4, 11, 18, 25) THEN 1
    WHEN day_num IN (5, 12, 19, 26) THEN 1
    WHEN day_num IN (6, 13, 20, 27) THEN 1
    WHEN day_num IN (7, 14, 21, 28) THEN 75
    ELSE 25
  END,
  ('2026-02-28'::date + (day_num - 1) * INTERVAL '1 day')::date,
  ('2026-02-28'::date + (day_num - 1) * INTERVAL '1 day')::date
FROM generate_series(1, 30) AS day_num;