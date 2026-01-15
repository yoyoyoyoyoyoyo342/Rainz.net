-- Add status column to track payment completion
ALTER TABLE public.tip_jar ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.tip_jar ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Delete all existing tips (reset to 0)
DELETE FROM public.tip_jar;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tip_jar_stripe_session ON public.tip_jar(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_tip_jar_status ON public.tip_jar(status);