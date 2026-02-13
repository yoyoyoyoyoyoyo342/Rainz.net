-- Create a system profile for the Rainz bot predictions account
INSERT INTO public.profiles (user_id, display_name, username, notification_enabled, notification_time, total_points, shop_points)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Rainz Bot',
  'rainz-bot',
  false,
  '08:00',
  0,
  0
)
ON CONFLICT (user_id) DO UPDATE SET display_name = 'Rainz Bot';