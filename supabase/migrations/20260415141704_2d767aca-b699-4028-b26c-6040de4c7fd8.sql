
DROP POLICY "Service can update API subscriptions" ON public.api_subscriptions;

CREATE POLICY "Users can update their own API subscription"
ON public.api_subscriptions FOR UPDATE
USING (auth.uid() = user_id);
