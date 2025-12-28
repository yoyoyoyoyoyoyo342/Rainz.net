-- Add free premium grants table for admins to give users free subscriptions
CREATE TABLE public.premium_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

-- Only admins can manage grants
CREATE POLICY "Admins can manage premium grants"
ON public.premium_grants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own grants
CREATE POLICY "Users can view their own premium grants"
ON public.premium_grants
FOR SELECT
USING (auth.uid() = user_id);

-- Add broadcast audience column
ALTER TABLE public.broadcast_messages 
ADD COLUMN audience text NOT NULL DEFAULT 'all',
ADD COLUMN audience_filter jsonb DEFAULT '{}';

-- Add API usage tracking for metered billing
CREATE TABLE public.api_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  api_key text NOT NULL,
  endpoint text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  response_status integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on api_usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own API usage"
ON public.api_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Create API keys table
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  api_key text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Default',
  is_active boolean NOT NULL DEFAULT true,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

-- Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own API keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
ON public.api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all API usage for analytics
CREATE POLICY "Admins can view all API usage"
ON public.api_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions need to insert usage records
CREATE POLICY "Service can insert API usage"
ON public.api_usage
FOR INSERT
WITH CHECK (true);