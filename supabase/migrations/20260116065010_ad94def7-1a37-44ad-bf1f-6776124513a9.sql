-- Create table to track which offers a user has already purchased
CREATE TABLE public.user_offer_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES public.shop_offers(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Enable RLS
ALTER TABLE public.user_offer_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own offer purchases
CREATE POLICY "Users can view their own offer purchases"
ON public.user_offer_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own offer purchases
CREATE POLICY "Users can insert their own offer purchases"
ON public.user_offer_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_offer_purchases_user_offer ON public.user_offer_purchases(user_id, offer_id);