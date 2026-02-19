
-- Feature Ideas: user suggestions + upvotes table
CREATE TABLE public.feature_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, planned, in_progress, done, rejected
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_idea_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.feature_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- RLS
ALTER TABLE public.feature_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_idea_votes ENABLE ROW LEVEL SECURITY;

-- feature_ideas policies
CREATE POLICY "Anyone can view feature ideas"
  ON public.feature_ideas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit ideas"
  ON public.feature_ideas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
  ON public.feature_ideas FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ideas"
  ON public.feature_ideas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- feature_idea_votes policies
CREATE POLICY "Anyone can view votes"
  ON public.feature_idea_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.feature_idea_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
  ON public.feature_idea_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to keep vote_count in sync
CREATE OR REPLACE FUNCTION public.sync_idea_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_ideas SET vote_count = vote_count + 1 WHERE id = NEW.idea_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_ideas SET vote_count = GREATEST(0, vote_count - 1) WHERE id = OLD.idea_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_vote_count_trigger
AFTER INSERT OR DELETE ON public.feature_idea_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_idea_vote_count();

-- updated_at trigger for feature_ideas
CREATE TRIGGER update_feature_ideas_updated_at
BEFORE UPDATE ON public.feature_ideas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
