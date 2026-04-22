-- Drop existing restrictive SELECT policies on social_posts
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'social_posts' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.social_posts', pol.policyname);
  END LOOP;
END $$;

-- Allow all authenticated users to read all social posts (public feed)
CREATE POLICY "Authenticated users can read all posts"
  ON public.social_posts
  FOR SELECT
  TO authenticated
  USING (true);