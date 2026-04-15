
-- Create enum for API tiers
CREATE TYPE public.api_tier AS ENUM ('free', 'pro', 'business');

-- Create API subscriptions table
CREATE TABLE public.api_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier api_tier NOT NULL DEFAULT 'free',
  stripe_subscription_id text,
  daily_limit integer NOT NULL DEFAULT 100,
  calls_today integer NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own API subscription"
ON public.api_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (free tier signup)
CREATE POLICY "Users can create their own API subscription"
ON public.api_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service can update any subscription (for Stripe webhooks and usage tracking)
CREATE POLICY "Service can update API subscriptions"
ON public.api_subscriptions FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_api_subscriptions_updated_at
BEFORE UPDATE ON public.api_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
