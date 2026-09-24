-- 021_fix_login_streak.sql
-- Migration to fix daily login streak calculation and automatic login syncing

-- 1. Create or replace sync_user_login RPC function
CREATE OR REPLACE FUNCTION public.sync_user_login(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_login DATE;
  v_streak INT;
  v_longest INT;
BEGIN
  SELECT last_login_date, login_streak, longest_login_streak
  INTO v_last_login, v_streak, v_longest
  FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
  END IF;

  IF v_last_login IS NULL THEN
    v_streak := 1;
  ELSIF v_last_login = v_today THEN
    -- Already logged in today, preserve current streak
    v_streak := COALESCE(v_streak, 1);
  ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
    -- Consecutive day login
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    -- Missed one or more days, streak resets and starts at 1 today
    v_streak := 1;
  END IF;

  IF v_streak > COALESCE(v_longest, 0) THEN
    v_longest := v_streak;
  END IF;

  UPDATE public.profiles
  SET last_login_date = v_today,
      login_streak = v_streak,
      longest_login_streak = COALESCE(v_longest, v_streak),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'login_streak', v_streak,
    'longest_login_streak', COALESCE(v_longest, v_streak),
    'last_login_date', v_today
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_user_login(UUID) TO anon, authenticated, service_role;

-- 2. Update claim_daily_login RPC function to use sync_user_login and daily_activity
CREATE OR REPLACE FUNCTION public.claim_daily_login(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_sync_res JSONB;
  v_already_claimed BOOLEAN;
  v_streak INT;
  v_xp_reward INT := 10;
  v_res JSONB;
BEGIN
  -- First sync the user login streak
  v_sync_res := public.sync_user_login(p_user_id);
  IF NOT (v_sync_res->>'success')::BOOLEAN THEN
    RETURN v_sync_res;
  END IF;

  v_streak := (v_sync_res->>'login_streak')::INT;

  -- Check if user already claimed daily reward today
  SELECT EXISTS(
    SELECT 1 FROM public.daily_activity
    WHERE user_id = p_user_id
      AND activity_date = v_today
      AND activity_type = 'daily_login'
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already claimed today!',
      'streak', v_streak
    );
  END IF;

  -- Grant Daily Login XP
  v_res := public.grant_xp(p_user_id, v_xp_reward, 'daily_login', v_today::TEXT, 'Daily Login Reward');

  -- Record daily activity
  INSERT INTO public.daily_activity (user_id, activity_date, activity_type, xp_earned)
  VALUES (p_user_id, v_today, 'daily_login', v_xp_reward)
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'streak', v_streak,
    'xp_earned', v_xp_reward,
    'message', 'Daily login streak claimed!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_daily_login(UUID) TO anon, authenticated, service_role;
