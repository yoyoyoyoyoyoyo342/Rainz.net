
-- Create social_posts table for text/image posts
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  location_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Users can read posts from people they follow
CREATE POLICY "Users can read followed users posts"
ON public.social_posts
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT following_id FROM public.user_follows WHERE follower_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Users can insert their own posts
CREATE POLICY "Users can create own posts"
ON public.social_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON public.social_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for feed queries
CREATE INDEX idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX idx_social_posts_created_at ON public.social_posts(created_at DESC);
