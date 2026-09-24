-- 002_functions_and_rls.sql
-- Functions, Triggers, RPCs and Row Level Security (RLS)

-- 1. Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Auto Create Profile Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_username TEXT;
BEGIN
  -- Generate unique Player ID e.g. ELITE-10482
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));

  INSERT INTO public.profiles (
    id,
    player_id,
    username,
    ign,
    free_fire_uid,
    avatar_url
  )
  VALUES (
    NEW.id,
    v_player_id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'ign', v_username),
    COALESCE(NEW.raw_user_meta_data->>'free_fire_uid', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png')
  );

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Atomic XP Grant & Level Recalculation RPC Function
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

  -- 1. Insert into auditable ledger
  INSERT INTO public.xp_transactions (
    user_id, amount, source_type, source_id, description
  ) VALUES (
    p_user_id, p_amount, p_source_type, p_source_id, p_description
  );

  -- 2. Update user profile total_xp & calculate level (Level = floor(sqrt(total_xp / 100)) + 1)
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
    'granted', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Daily Login Streak Claim RPC
CREATE OR REPLACE FUNCTION public.claim_daily_login(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_login DATE;
  v_streak INT;
  v_longest INT;
  v_xp_reward INT := 10;
  v_res JSONB;
BEGIN
  SELECT last_login_date, login_streak, longest_login_streak
  INTO v_last_login, v_streak, v_longest
  FROM public.profiles WHERE id = p_user_id;

  IF v_last_login = v_today THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today!');
  END IF;

  IF v_last_login = v_today - INTERVAL '1 day' THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak > COALESCE(v_longest, 0) THEN
    v_longest := v_streak;
  END IF;

  UPDATE public.profiles
  SET last_login_date = v_today,
      login_streak = v_streak,
      longest_login_streak = v_longest,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

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

-- 5. QnA Answer Submission RPC (Validates without exposing answer key)
CREATE OR REPLACE FUNCTION public.submit_qna_answer(
  p_question_id UUID,
  p_selected_answer INT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_correct_answer INT;
  v_xp_reward INT;
  v_is_correct BOOLEAN;
  v_already_attempted BOOLEAN;
  v_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Check if already attempted
  SELECT EXISTS (
    SELECT 1 FROM public.qna_attempts
    WHERE user_id = v_user_id AND question_id = p_question_id
  ) INTO v_already_attempted;

  IF v_already_attempted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question already answered');
  END IF;

  -- Fetch correct answer from private schema column
  SELECT correct_answer, xp_reward INTO v_correct_answer, v_xp_reward
  FROM public.qna_questions WHERE id = p_question_id AND is_active = true;

  IF v_correct_answer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question not found or inactive');
  END IF;

  v_is_correct := (v_correct_answer = p_selected_answer);

  -- Record attempt
  INSERT INTO public.qna_attempts (
    user_id, question_id, selected_answer, is_correct, xp_earned
  ) VALUES (
    v_user_id, p_question_id, p_selected_answer, v_is_correct, IF(v_is_correct, v_xp_reward, 0)
  );

  IF v_is_correct THEN
    v_res := public.grant_xp(v_user_id, v_xp_reward, 'qna_quiz', p_question_id::TEXT, 'QnA Quiz Correct Answer');
    RETURN jsonb_build_object('success', true, 'correct', true, 'xp_earned', v_xp_reward, 'message', 'Correct! XP awarded.');
  ELSE
    RETURN jsonb_build_object('success', true, 'correct', false, 'xp_earned', 0, 'message', 'Incorrect answer. Try the next question!');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qna_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qna_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile permitted fields" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- TOURNAMENTS
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can insert/update/delete tournaments" ON public.tournaments FOR ALL USING (public.is_admin(auth.uid()));

-- TOURNAMENT REGISTRATIONS
CREATE POLICY "Registrations viewable by everyone" ON public.tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON public.tournament_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own registration status" ON public.tournament_registrations FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- TOURNAMENT MATCHES
CREATE POLICY "Matches viewable by everyone" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.tournament_matches FOR ALL USING (public.is_admin(auth.uid()));

-- GUILDS & MEMBERS
CREATE POLICY "Guilds viewable by everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Guild leaders manage guild" ON public.guilds FOR UPDATE USING (auth.uid() = leader_id OR public.is_admin(auth.uid()));
CREATE POLICY "Guild members viewable by everyone" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Users can apply/join guild" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP TRANSACTIONS
CREATE POLICY "Users view own XP transactions" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ACHIEVEMENTS
CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "User achievements viewable by everyone" ON public.user_achievements FOR SELECT USING (true);

-- DAILY ACTIVITY
CREATE POLICY "Users view own daily activity" ON public.daily_activity FOR SELECT USING (auth.uid() = user_id);

-- GIVEAWAYS
CREATE POLICY "Giveaways viewable by everyone" ON public.giveaways FOR SELECT USING (true);
CREATE POLICY "Giveaway entries viewable by authenticated user" ON public.giveaway_entries FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can enter active giveaway" ON public.giveaway_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- QNA QUESTIONS & ATTEMPTS
CREATE POLICY "QnA questions viewable by everyone" ON public.qna_questions FOR SELECT USING (is_active = true);
CREATE POLICY "Users view own QnA attempts" ON public.qna_attempts FOR SELECT USING (auth.uid() = user_id);

-- ANNOUNCEMENTS
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (published = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (public.is_admin(auth.uid()));

-- COMMUNITY CLIPS
CREATE POLICY "Approved clips viewable by everyone" ON public.community_clips FOR SELECT USING (moderation_status = 'approved' OR auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can submit clips" ON public.community_clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins moderate clips" ON public.community_clips FOR UPDATE USING (public.is_admin(auth.uid()));

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notification read state" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- AUDIT LOGS
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
