-- Add emergency columns to broadcast_messages
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS is_emergency boolean NOT NULL DEFAULT false;
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS locks_app boolean NOT NULL DEFAULT false;

-- Allow admins to update broadcast_messages (needed for lift lockdown)
CREATE POLICY "Admins can update broadcast messages"
ON public.broadcast_messages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert app_lockdown feature flag (disabled by default)
INSERT INTO public.feature_flags (key, enabled, updated_at)
VALUES ('app_lockdown', false, now())
ON CONFLICT (key) DO NOTHING;