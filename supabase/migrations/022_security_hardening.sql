-- Migration 022: Security Hardening
-- Fixes search_path, revokes unsafe RPCs, restricts admin escalation, and enables RLS policies for giveaway_winners

-- 1. Helper function: is_admin with immutable search_path
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 2. Helper function: is_moderator_or_admin with immutable search_path
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Secure make_user_admin (Caller MUST be an admin or service_role)
CREATE OR REPLACE FUNCTION public.make_user_admin(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only admins can assign roles');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email not found in auth.users');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';

  RETURN jsonb_build_object('success', true, 'message', 'Promoted ' || p_email || ' to Admin!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.make_user_admin(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.make_user_admin(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.make_user_admin(TEXT) TO authenticated, service_role;

-- 4. Secure handle_new_user trigger (Prevent wildcard %admin% privilege escalation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_username TEXT;
  v_ign TEXT;
  v_uid TEXT;
BEGIN
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_ign := COALESCE(NEW.raw_user_meta_data->>'ign', v_username);
  v_uid := COALESCE(NEW.raw_user_meta_data->>'free_fire_uid', '');

  INSERT INTO public.profiles (
    id, player_id, username, ign, free_fire_uid, avatar_url
  ) VALUES (
    NEW.id,
    v_player_id,
    v_username,
    v_ign,
    v_uid,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png')
  )
  ON CONFLICT (id) DO UPDATE SET
    free_fire_uid = CASE WHEN EXCLUDED.free_fire_uid <> '' THEN EXCLUDED.free_fire_uid ELSE public.profiles.free_fire_uid END,
    ign = CASE WHEN EXCLUDED.ign <> '' THEN EXCLUDED.ign ELSE public.profiles.ign END;

  -- Only grant admin role to designated master admin email
  IF LOWER(NEW.email) = 'praveenmirji866@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 5. Secure grant_xp: internal function only, NEVER callable by anonymous or non-admin clients directly
CREATE OR REPLACE FUNCTION public.grant_xp(
  p_user_id UUID,
  p_amount INT,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_current_xp INT;
  v_new_xp INT;
  v_new_level INT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid XP amount');
  END IF;

  INSERT INTO public.xp_transactions (
    user_id, amount, source_type, source_id, description
  ) VALUES (
    p_user_id, p_amount, p_source_type, p_source_id, p_description
  );

  SELECT total_xp INTO v_current_xp FROM public.profiles WHERE id = p_user_id;
  v_new_xp := COALESCE(v_current_xp, 0) + p_amount;
  v_new_level := floor(sqrt(v_new_xp / 100))::INT + 1;

  UPDATE public.profiles
  SET total_xp = v_new_xp,
      level = v_new_level,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'xp_gained', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.grant_xp(UUID, INT, TEXT, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.grant_xp(UUID, INT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_xp(UUID, INT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp(UUID, INT, TEXT, TEXT, TEXT) TO service_role;

-- 6. Secure claim_daily_login: restrict to authenticated user claiming their own reward
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
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: cannot claim for another user');
  END IF;

  v_sync_res := public.sync_user_login(p_user_id);
  IF NOT (v_sync_res->>'success')::BOOLEAN THEN
    RETURN v_sync_res;
  END IF;

  v_streak := (v_sync_res->>'login_streak')::INT;

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

  v_res := public.grant_xp(p_user_id, v_xp_reward, 'daily_login', v_today::TEXT, 'Daily Login Reward');

  INSERT INTO public.daily_activity (user_id, activity_date, activity_type, xp_earned)
  VALUES (p_user_id, v_today, 'daily_login', v_xp_reward)
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Claimed +' || v_xp_reward || ' XP daily reward!',
    'streak', v_streak,
    'xp_earned', v_xp_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.claim_daily_login(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.claim_daily_login(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_login(UUID) TO authenticated, service_role;

-- 7. Secure submit_qna_answer
CREATE OR REPLACE FUNCTION public.submit_qna_answer(
  p_question_id UUID,
  p_selected_answer INT
)
RETURNS JSONB AS $$
DECLARE
  v_correct_idx INT;
  v_xp_reward INT;
  v_is_correct BOOLEAN;
  v_user_id UUID := auth.uid();
  v_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to submit quiz answers');
  END IF;

  SELECT correct_answer, xp_reward INTO v_correct_idx, v_xp_reward
  FROM public.qna_questions
  WHERE id = p_question_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question not found or inactive');
  END IF;

  v_is_correct := (v_correct_idx = p_selected_answer);

  INSERT INTO public.qna_responses (question_id, user_id, selected_answer, is_correct)
  VALUES (p_question_id, v_user_id, p_selected_answer, v_is_correct);

  IF v_is_correct THEN
    v_res := public.grant_xp(v_user_id, v_xp_reward, 'qna_quiz', p_question_id::TEXT, 'QnA Quiz Correct Answer');
    RETURN jsonb_build_object(
      'success', true,
      'is_correct', true,
      'xp_awarded', v_xp_reward,
      'message', 'Correct answer! +' || v_xp_reward || ' XP gained!'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'is_correct', false,
      'xp_awarded', 0,
      'message', 'Incorrect answer. Try the next question!'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_qna_answer(UUID, INT) FROM public;
REVOKE EXECUTE ON FUNCTION public.submit_qna_answer(UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_qna_answer(UUID, INT) TO authenticated, service_role;

-- 8. Fix search_path on remaining functions
ALTER FUNCTION public.create_player_account(TEXT, TEXT, TEXT, TEXT) SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.register_tournament_team(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) SET search_path = public, auth, pg_temp;

-- 9. Enable RLS and add policies for giveaway_winners
ALTER TABLE public.giveaway_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giveaway winners viewable by everyone" ON public.giveaway_winners;
CREATE POLICY "Giveaway winners viewable by everyone" 
ON public.giveaway_winners FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins manage giveaway winners" ON public.giveaway_winners;
CREATE POLICY "Admins manage giveaway winners" 
ON public.giveaway_winners FOR ALL 
USING (public.is_admin(auth.uid()));
