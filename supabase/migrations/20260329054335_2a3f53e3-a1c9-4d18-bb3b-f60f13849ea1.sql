-- Function to send push notification when a new inbox message is created
CREATE OR REPLACE FUNCTION public.notify_on_inbox_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _resp bigint;
BEGIN
  -- Skip if this notification was created by send-push-notification itself
  -- (detected by metadata containing skip_inbox = true)
  IF (NEW.metadata->>'skip_inbox')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Fire HTTP call to send-push-notification (push only, no duplicate inbox)
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object('type', NEW.type, 'skip_inbox', true)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  ) INTO _resp;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_on_inbox_insert error: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_push_notification
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_inbox_insert();