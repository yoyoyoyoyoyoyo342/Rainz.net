-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  points integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements table to track earned achievements
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are readable by everyone
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Users can view all user achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
-- Prediction achievements
('First Prediction', 'Make your first weather prediction', '🎯', 'predictions', 'predictions_made', 1, 10),
('Weather Watcher', 'Make 10 weather predictions', '👀', 'predictions', 'predictions_made', 10, 25),
('Prediction Pro', 'Make 50 weather predictions', '📊', 'predictions', 'predictions_made', 50, 50),
('Forecast Master', 'Make 100 weather predictions', '🏆', 'predictions', 'predictions_made', 100, 100),
('Prediction Legend', 'Make 500 weather predictions', '👑', 'predictions', 'predictions_made', 500, 250),

-- Accuracy achievements
('Lucky Guess', 'Get your first correct prediction', '🍀', 'accuracy', 'correct_predictions', 1, 15),
('Sharp Eye', 'Get 10 correct predictions', '🎯', 'accuracy', 'correct_predictions', 10, 30),
('Weather Sage', 'Get 50 correct predictions', '🧙', 'accuracy', 'correct_predictions', 50, 75),
('Oracle', 'Get 100 correct predictions', '🔮', 'accuracy', 'correct_predictions', 100, 150),

-- Streak achievements
('Getting Started', 'Reach a 3-day prediction streak', '🔥', 'streaks', 'current_streak', 3, 15),
('On Fire', 'Reach a 7-day prediction streak', '💪', 'streaks', 'current_streak', 7, 30),
('Dedicated', 'Reach a 14-day prediction streak', '⭐', 'streaks', 'current_streak', 14, 50),
('Unstoppable', 'Reach a 30-day prediction streak', '🚀', 'streaks', 'current_streak', 30, 100),
('Weather Warrior', 'Reach a 100-day prediction streak', '⚔️', 'streaks', 'current_streak', 100, 300),

-- Points achievements
('Point Collector', 'Earn 100 points', '💎', 'points', 'total_points', 100, 20),
('Point Hoarder', 'Earn 500 points', '💰', 'points', 'total_points', 500, 50),
('Point Master', 'Earn 1000 points', '🏅', 'points', 'total_points', 1000, 100),
('Point Champion', 'Earn 5000 points', '🎖️', 'points', 'total_points', 5000, 200),

-- Battle achievements
('First Blood', 'Win your first prediction battle', '⚔️', 'battles', 'battles_won', 1, 25),
('Battle Veteran', 'Win 10 prediction battles', '🛡️', 'battles', 'battles_won', 10, 50),
('Battle Champion', 'Win 50 prediction battles', '🏆', 'battles', 'battles_won', 50, 150),

-- Game achievements
('Gamer', 'Play your first weather game', '🎮', 'games', 'games_played', 1, 10),
('Game Enthusiast', 'Play 10 weather games', '🕹️', 'games', 'games_played', 10, 25),
('Game Master', 'Play 50 weather games', '👾', 'games', 'games_played', 50, 75),

-- Location achievements
('Explorer', 'Search for 10 different locations', '🗺️', 'exploration', 'locations_searched', 10, 20),
('Globe Trotter', 'Search for 50 different locations', '🌍', 'exploration', 'locations_searched', 50, 50),
('World Traveler', 'Search for 100 different locations', '✈️', 'exploration', 'locations_searched', 100, 100),

-- Special achievements
('Early Bird', 'Check weather before 6 AM', '🌅', 'special', 'early_check', 1, 15),
('Night Owl', 'Check weather after midnight', '🌙', 'special', 'night_check', 1, 15),
('Social Butterfly', 'Share weather 5 times', '🦋', 'special', 'shares', 5, 25),
('AI Friend', 'Have 10 AI chat conversations', '🤖', 'special', 'ai_chats', 10, 30);

-- Create index for faster queries
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_achievements_category ON public.achievements(category);