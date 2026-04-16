
-- Add post_type and counters to social_posts
ALTER TABLE public.social_posts 
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- Create social_post_likes
CREATE TABLE public.social_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes" ON public.social_post_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON public.social_post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.social_post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create social_post_comments
CREATE TABLE public.social_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments" ON public.social_post_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.social_post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.social_post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers for like/comment counters
CREATE OR REPLACE FUNCTION public.sync_social_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_post_like_count
AFTER INSERT OR DELETE ON public.social_post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_social_post_like_count();

CREATE OR REPLACE FUNCTION public.sync_social_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_post_comment_count
AFTER INSERT OR DELETE ON public.social_post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_social_post_comment_count();

-- Indexes
CREATE INDEX idx_social_post_likes_post ON public.social_post_likes(post_id);
CREATE INDEX idx_social_post_comments_post ON public.social_post_comments(post_id);
