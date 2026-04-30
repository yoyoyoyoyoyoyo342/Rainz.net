
-- Referral tracking table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referee_id)
);

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view referrals they made"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id);

-- Users can view referrals where they are the referee
CREATE POLICY "Users can view their own referee record"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referee_id);

-- Service/authenticated can insert referrals
CREATE POLICY "Authenticated users can create referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referee_id);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.referrals FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow updating points_awarded
CREATE POLICY "Users can update their own referrals"
ON public.referrals FOR UPDATE
TO authenticated
USING (auth.uid() = referrer_id);
