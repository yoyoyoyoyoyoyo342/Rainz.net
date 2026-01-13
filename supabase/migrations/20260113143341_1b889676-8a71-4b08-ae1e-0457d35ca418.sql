-- Create shop_offers table for admin-controlled discounts
CREATE TABLE public.shop_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT NOT NULL,
  original_price INTEGER NOT NULL,
  offer_price INTEGER NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.shop_offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers"
ON public.shop_offers
FOR SELECT
USING (is_active = true);

-- Only admins can manage offers (using has_role function)
CREATE POLICY "Admins can insert offers"
ON public.shop_offers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update offers"
ON public.shop_offers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete offers"
ON public.shop_offers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));