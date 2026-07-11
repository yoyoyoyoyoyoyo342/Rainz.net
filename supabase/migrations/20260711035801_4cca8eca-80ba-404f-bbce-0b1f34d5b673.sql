
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points)
VALUES ('SF Founder', 'Signed up in the San Francisco Bay Area during the launch expansion', '🌉', 'special', 'sf_founder', 1, 500)
ON CONFLICT DO NOTHING;
