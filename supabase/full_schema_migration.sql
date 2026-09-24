-- ELITE double-schema combined migration script
-- Project URL: https://lmawrsmjyermswzwttbe.supabase.co
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lmawrsmjyermswzwttbe/sql/new

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  ign TEXT NOT NULL,
  free_fire_uid TEXT,
  avatar_url TEXT DEFAULT 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png',
  banner_url TEXT,
  bio TEXT DEFAULT 'ELITE Kannada Gaming Community Member',
  guild_id UUID,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  login_streak INTEGER DEFAULT 0 NOT NULL,
  longest_login_streak INTEGER DEFAULT 0 NOT NULL,
  last_login_date DATE,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role)
);

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_url TEXT,
  game_mode TEXT DEFAULT 'SQUAD BATTLE' NOT NULL,
  map TEXT DEFAULT 'BERMUDA' NOT NULL,
  tournament_type TEXT DEFAULT 'FREE' NOT NULL,
  entry_type TEXT DEFAULT 'SOLO' NOT NULL CHECK (entry_type IN ('SOLO', 'SQUAD', 'GUILD')),
  prize_pool TEXT DEFAULT '₹10,000' NOT NULL,
  max_slots INTEGER DEFAULT 100 NOT NULL,
  registration_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  registration_end TIMESTAMPTZ,
  tournament_start TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'registration_open' NOT NULL CHECK (status IN ('draft', 'upcoming', 'registration_open', 'full', 'live', 'completed', 'cancelled')),
  rules TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tournament Registrations Table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name TEXT,
  registration_status TEXT DEFAULT 'confirmed' NOT NULL CHECK (registration_status IN ('confirmed', 'waitlist', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_in_at TIMESTAMPTZ,
  placement INTEGER,
  kills INTEGER DEFAULT 0,
  result_verified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tournament_id, user_id)
);

-- 5. Tournament Matches Table
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_name TEXT DEFAULT 'Round 1' NOT NULL,
  match_number INTEGER DEFAULT 1 NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Guilds Table
CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  leader_id UUID REFERENCES public.profiles(id),
  glory_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Foreign key link back from profiles to guilds
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_guild FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE SET NULL;

-- 7. Guild Members Table
CREATE TABLE IF NOT EXISTS public.guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guild_role TEXT DEFAULT 'member' NOT NULL CHECK (guild_role IN ('leader', 'officer', 'member')),
  glory_contributed INTEGER DEFAULT 0 NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('pending', 'active', 'declined')),
  UNIQUE(guild_id, user_id)
);

-- 8. XP Transactions Table (Auditable XP Ledger)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('daily_login', 'qna_quiz', 'tournament_participation', 'tournament_win', 'achievement_unlock', 'clip_approved', 'guild_event', 'admin_adjustment')),
  source_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  achievement_type TEXT NOT NULL,
  requirement_config JSONB DEFAULT '{}'::jsonb,
  xp_reward INTEGER DEFAULT 100 NOT NULL,
  rarity TEXT DEFAULT 'COMMON' NOT NULL CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  progress INTEGER DEFAULT 100 NOT NULL,
  is_completed BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 11. Daily Activity Table
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('daily_login', 'qna_answered', 'tournament_played', 'stream_watched')),
  activity_value INTEGER DEFAULT 1 NOT NULL,
  xp_earned INTEGER DEFAULT 0 NOT NULL,
  source_reference TEXT,
  verified BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, activity_date, activity_type)
);

-- 12. Giveaways Table
CREATE TABLE IF NOT EXISTS public.giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  banner_url TEXT,
  start_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('draft', 'active', 'ended', 'drawn', 'cancelled')),
  eligibility_rules JSONB DEFAULT '{}'::jsonb,
  winner_selection_method TEXT DEFAULT 'random_draw' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Giveaway Entries Table
CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_status TEXT DEFAULT 'valid' NOT NULL CHECK (entry_status IN ('valid', 'disqualified')),
  entered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(giveaway_id, user_id)
);

-- 14. Giveaway Winners Table
CREATE TABLE IF NOT EXISTS public.giveaway_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prize_description TEXT NOT NULL,
  announced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  verification_status TEXT DEFAULT 'verified' NOT NULL CHECK (verification_status IN ('pending', 'verified', 'claimed')),
  UNIQUE(giveaway_id, user_id)
);

-- 15. QnA Questions Table
CREATE TABLE IF NOT EXISTS public.qna_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT DEFAULT 'Free Fire Intel' NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  xp_reward INTEGER DEFAULT 10 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. QnA Attempts Table
CREATE TABLE IF NOT EXISTS public.qna_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.qna_questions(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  xp_earned INTEGER DEFAULT 0 NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, question_id)
);

-- 17. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'ANNOUNCEMENT' NOT NULL,
  thumbnail_url TEXT,
  published BOOLEAN DEFAULT true NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Community Clips Table
CREATE TABLE IF NOT EXISTS public.community_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'CLUTCH' NOT NULL,
  moderation_status TEXT DEFAULT 'pending' NOT NULL CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info' NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON public.profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON public.guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_moderation ON public.community_clips(moderation_status);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON public.daily_activity(user_id, activity_date);

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_username TEXT;
BEGIN
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));

  INSERT INTO public.profiles (
    id, player_id, username, ign, free_fire_uid, avatar_url
  ) VALUES (
    NEW.id, v_player_id, v_username, COALESCE(NEW.raw_user_meta_data->>'ign', v_username), COALESCE(NEW.raw_user_meta_data->>'free_fire_uid', ''), COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic XP Grant Function
CREATE OR REPLACE FUNCTION public.grant_xp(
  p_user_id UUID, p_amount INT, p_source_type TEXT, p_source_id TEXT DEFAULT NULL, p_description TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
  v_current_xp INT; v_new_xp INT; v_new_level INT;
BEGIN
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid XP amount'); END IF;

  INSERT INTO public.xp_transactions (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description);

  SELECT total_xp INTO v_current_xp FROM public.profiles WHERE id = p_user_id;
  v_new_xp := COALESCE(v_current_xp, 0) + p_amount;
  v_new_level := floor(sqrt(v_new_xp / 100))::INT + 1;

  UPDATE public.profiles
  SET total_xp = v_new_xp, level = v_new_level, updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_xp', v_new_xp, 'new_level', v_new_level, 'granted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync User Login Streak Function
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
    v_streak := COALESCE(v_streak, 1);
  ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
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

-- Daily Login Streak Function
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
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today!', 'streak', v_streak);
  END IF;

  v_res := public.grant_xp(p_user_id, v_xp_reward, 'daily_login', v_today::TEXT, 'Daily Login Reward');

  INSERT INTO public.daily_activity (user_id, activity_date, activity_type, xp_earned)
  VALUES (p_user_id, v_today, 'daily_login', v_xp_reward)
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'streak', v_streak, 'xp_earned', v_xp_reward, 'message', 'Daily login streak claimed!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- QnA Answer Submission Function
CREATE OR REPLACE FUNCTION public.submit_qna_answer(p_question_id UUID, p_selected_answer INT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_correct_answer INT; v_xp_reward INT; v_is_correct BOOLEAN; v_already_attempted BOOLEAN; v_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;

  SELECT EXISTS (SELECT 1 FROM public.qna_attempts WHERE user_id = v_user_id AND question_id = p_question_id) INTO v_already_attempted;
  IF v_already_attempted THEN RETURN jsonb_build_object('success', false, 'error', 'Question already answered'); END IF;

  SELECT correct_answer, xp_reward INTO v_correct_answer, v_xp_reward FROM public.qna_questions WHERE id = p_question_id AND is_active = true;
  IF v_correct_answer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Question not found or inactive'); END IF;

  v_is_correct := (v_correct_answer = p_selected_answer);

  INSERT INTO public.qna_attempts (user_id, question_id, selected_answer, is_correct, xp_earned)
  VALUES (v_user_id, p_question_id, p_selected_answer, v_is_correct, CASE WHEN v_is_correct THEN v_xp_reward ELSE 0 END);

  IF v_is_correct THEN
    v_res := public.grant_xp(v_user_id, v_xp_reward, 'qna_quiz', p_question_id::TEXT, 'QnA Quiz Correct Answer');
    RETURN jsonb_build_object('success', true, 'correct', true, 'xp_earned', v_xp_reward, 'message', 'Correct! XP awarded.');
  ELSE
    RETURN jsonb_build_object('success', true, 'correct', false, 'xp_earned', 0, 'message', 'Incorrect answer.');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENABLE RLS ON ALL TABLES
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

-- POLICIES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile permitted fields" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can insert/update/delete tournaments" ON public.tournaments FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Registrations viewable by everyone" ON public.tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON public.tournament_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own registration status" ON public.tournament_registrations FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Matches viewable by everyone" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.tournament_matches FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Guilds viewable by everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Guild leaders manage guild" ON public.guilds FOR UPDATE USING (auth.uid() = leader_id OR public.is_admin(auth.uid()));
CREATE POLICY "Guild members viewable by everyone" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Users can apply/join guild" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own XP transactions" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "User achievements viewable by everyone" ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Users view own daily activity" ON public.daily_activity FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Giveaways viewable by everyone" ON public.giveaways FOR SELECT USING (true);
CREATE POLICY "Giveaway entries viewable by authenticated user" ON public.giveaway_entries FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can enter active giveaway" ON public.giveaway_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "QnA questions viewable by everyone" ON public.qna_questions FOR SELECT USING (is_active = true);
CREATE POLICY "Users view own QnA attempts" ON public.qna_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (published = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Approved clips viewable by everyone" ON public.community_clips FOR SELECT USING (moderation_status = 'approved' OR auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can submit clips" ON public.community_clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins moderate clips" ON public.community_clips FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notification read state" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- SEED MOCK DATA SO TABLES ARE POPULATED IMMEDIATELY
INSERT INTO public.tournaments (title, slug, game_mode, map, prize_pool, max_slots, tournament_start, status)
VALUES 
  ('ELITE CLASH #24', 'elite-clash-24', 'SQUAD BATTLE', 'BERMUDA', '₹10,000', 100, timezone('utc'::text, now() + interval '1 day'), 'registration_open'),
  ('NIGHT RAID', 'night-raid', 'BR SOLO', 'PURGATORY', '₹5,000', 100, timezone('utc'::text, now() + interval '5 days'), 'registration_open'),
  ('GUILD WAR: ORIGIN', 'guild-war-origin', 'GUILD VS GUILD', 'BERMUDA', '₹25,000', 32, timezone('utc'::text, now() + interval '12 days'), 'upcoming')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.qna_questions (question, category, options, correct_answer, explanation, xp_reward)
VALUES 
  ('What is the maximum armor durability of Level 3 Vest in Bermuda?', 'Free Fire Intel', '["200", "260", "290", "320"]'::jsonb, 1, 'Level 3 vest provides 260 durability.', 10),
  ('Which character skill provides temporary movement speed and shield protection?', 'Character Skills', '["Alok", "Chrono", "K", "Skyler"]'::jsonb, 1, 'Chrono generates an 800 HP forcefield.', 10)
ON CONFLICT DO NOTHING;
