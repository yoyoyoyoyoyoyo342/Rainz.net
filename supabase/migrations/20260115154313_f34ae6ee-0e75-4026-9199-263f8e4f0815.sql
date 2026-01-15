-- Fix RLS policy to allow viewing leagues by invite code for joining
DROP POLICY IF EXISTS "Anyone can view public leagues" ON public.prediction_leagues;

CREATE POLICY "Anyone can view leagues for joining" 
ON public.prediction_leagues 
FOR SELECT 
USING (
  is_public = true 
  OR created_by = auth.uid()
  OR id IN (SELECT league_id FROM public.league_members WHERE user_id = auth.uid())
  OR true  -- Allow reading any league (invite_code is validated in application logic)
);

-- Add update policy for owners/admins to update member roles
DROP POLICY IF EXISTS "Owners/admins can manage members" ON public.league_members;

CREATE POLICY "Owners/admins can manage members" 
ON public.league_members 
FOR DELETE 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_members.league_id 
    AND lm.user_id = auth.uid() 
    AND lm.role IN ('owner', 'admin')
  )
);

-- Add update policy for member roles
CREATE POLICY "Owners/admins can update member roles" 
ON public.league_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_members.league_id 
    AND lm.user_id = auth.uid() 
    AND lm.role IN ('owner', 'admin')
  )
);