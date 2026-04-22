
DROP FUNCTION IF EXISTS public.get_leaderboard();
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS TABLE(rank bigint, display_name text, avatar_url text, total_points integer, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, trophy_count bigint, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    row_number() OVER (ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    p.display_name,
    p.avatar_url,
    p.total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id), 0::bigint) AS total_predictions,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id AND wp.is_verified = true AND wp.is_correct = true), 0::bigint) AS correct_predictions,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    p.user_id
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT s.current_streak, s.longest_streak
    FROM user_streaks s
    WHERE s.user_id = p.user_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) us ON true
  WHERE p.display_name IS NOT NULL
  ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC
  LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
 RETURNS TABLE(rank bigint, display_name text, avatar_url text, total_points bigint, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, trophy_count bigint, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    row_number() OVER (ORDER BY COALESCE(SUM(wp.points_earned), 0) DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    prof.display_name,
    prof.avatar_url,
    COALESCE(SUM(wp.points_earned), 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COUNT(wp.id)::bigint AS total_predictions,
    COUNT(CASE WHEN wp.is_correct = true THEN 1 END)::bigint AS correct_predictions,
    COALESCE(prof.trophy_count, 0)::bigint AS trophy_count,
    prof.user_id
  FROM profiles prof
  LEFT JOIN LATERAL (
    SELECT s.current_streak, s.longest_streak
    FROM user_streaks s
    WHERE s.user_id = prof.user_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) us ON true
  LEFT JOIN weather_predictions wp
    ON wp.user_id = prof.user_id
    AND wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', now())::date
    AND wp.prediction_date < (date_trunc('month', now()) + interval '1 month')::date
  WHERE prof.display_name IS NOT NULL
  GROUP BY prof.user_id, prof.display_name, prof.avatar_url, prof.trophy_count, us.current_streak, us.longest_streak
  HAVING COALESCE(SUM(wp.points_earned), 0) > 0
  ORDER BY total_points DESC, current_streak DESC
  LIMIT 10;
$function$;

CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _author_name text; _preview text;
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO _author_name FROM public.profiles WHERE user_id = NEW.user_id;
  _preview := CASE WHEN length(NEW.content) > 80 THEN substring(NEW.content, 1, 77) || '...' ELSE NEW.content END;
  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  SELECT uf.follower_id, _author_name || ' just posted', _preview, 'social_post',
    jsonb_build_object('post_id', NEW.id, 'author_id', NEW.user_id)
  FROM public.user_follows uf WHERE uf.following_id = NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_followers_on_post error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_post ON public.social_posts;
CREATE TRIGGER trg_notify_followers_on_post
  AFTER INSERT ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _follower_name text;
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO _follower_name FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  VALUES (NEW.following_id, _follower_name || ' started following you', 'Tap to view their profile', 'social_follow',
    jsonb_build_object('follower_id', NEW.follower_id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_new_follow error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_follow ON public.user_follows;
CREATE TRIGGER trg_notify_on_new_follow
  AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_follow();

CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _post_author uuid; _commenter_name text; _preview text;
BEGIN
  SELECT user_id INTO _post_author FROM public.social_posts WHERE id = NEW.post_id;
  IF _post_author IS NULL OR _post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO _commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  _preview := CASE WHEN length(NEW.content) > 80 THEN substring(NEW.content, 1, 77) || '...' ELSE NEW.content END;
  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  VALUES (_post_author, _commenter_name || ' commented on your post', _preview, 'social_comment',
    jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_post_comment error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_post_comment ON public.social_post_comments;
CREATE TRIGGER trg_notify_on_post_comment
  AFTER INSERT ON public.social_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();
