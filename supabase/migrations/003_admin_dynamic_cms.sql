-- 003_admin_dynamic_cms.sql
-- Admin Dynamic CMS, Tournament Team Registrations with Duplicate UID Prevention, ELITE ARMY Single Guild, and Custom Leaderboards

-- 1. Home Cards Table (Dynamic Home Page Cards & Stats)
CREATE TABLE IF NOT EXISTS public.home_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT DEFAULT 'HERO_STATS' NOT NULL CHECK (section IN ('HERO_STATS', 'ARENA_HIGHLIGHTS', 'COMMUNITY_FEATURES', 'COMMUNITY_STATS')),
  title TEXT NOT NULL,
  subtitle TEXT,
  stat_number TEXT,
  stat_label TEXT,
  image_url TEXT,
  link_url TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Leaderboard Sections Table (Custom Leaderboard Categories)
CREATE TABLE IF NOT EXISTS public.leaderboard_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT DEFAULT 'Trophy' NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enhance Tournament Registrations Table (Captain, Phone, Teammates)
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS captain_name TEXT,
  ADD COLUMN IF NOT EXISTS captain_free_fire_uid TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS teammate_uids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teammate_names JSONB DEFAULT '[]'::jsonb;

-- Index for UID checks
CREATE INDEX IF NOT EXISTS idx_tournament_reg_captain_uid ON public.tournament_registrations(tournament_id, captain_free_fire_uid);

-- 4. Atomic Tournament Registration RPC with Duplicate Free Fire UID Prevention
CREATE OR REPLACE FUNCTION public.register_tournament_team(
  p_tournament_id UUID,
  p_user_id UUID,
  p_captain_name TEXT,
  p_captain_uid TEXT,
  p_phone TEXT,
  p_team_name TEXT DEFAULT NULL,
  p_teammate_uids JSONB DEFAULT '[]'::jsonb,
  p_teammate_names JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_max_slots INT;
  v_current_slots INT;
  v_uid_conflict TEXT;
  v_existing_uids JSONB;
BEGIN
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free Fire UID is required for registration.');
  END IF;

  -- 1. Check max slot limits
  SELECT max_slots INTO v_max_slots FROM public.tournaments WHERE id = p_tournament_id;
  IF v_max_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found.');
  END IF;

  SELECT COUNT(*) INTO v_current_slots FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id AND registration_status = 'confirmed';

  IF v_current_slots >= v_max_slots THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full! All slots have been filled.');
  END IF;

  -- 2. Duplicate UID Check: Check if captain UID already registered for this tournament
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND (captain_free_fire_uid = TRIM(p_captain_uid) OR teammate_uids @> jsonb_build_array(TRIM(p_captain_uid)))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free Fire UID (' || p_captain_uid || ') is already registered for this tournament!');
  END IF;

  -- 3. Duplicate UID Check for teammates
  FOR v_uid_conflict IN SELECT jsonb_array_elements_text(p_teammate_uids)
  LOOP
    IF TRIM(v_uid_conflict) <> '' AND EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = p_tournament_id
        AND (captain_free_fire_uid = TRIM(v_uid_conflict) OR teammate_uids @> jsonb_build_array(TRIM(v_uid_conflict)))
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Teammate Free Fire UID (' || v_uid_conflict || ') is already registered for this tournament!');
    END IF;
  END LOOP;

  -- 4. Perform Registration Insertion
  INSERT INTO public.tournament_registrations (
    tournament_id,
    user_id,
    team_name,
    captain_name,
    captain_free_fire_uid,
    phone_number,
    teammate_uids,
    teammate_names,
    registration_status
  ) VALUES (
    p_tournament_id,
    p_user_id,
    COALESCE(p_team_name, p_captain_name),
    p_captain_name,
    TRIM(p_captain_uid),
    p_phone,
    p_teammate_uids,
    p_teammate_names,
    'confirmed'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Successfully registered for the tournament!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Seed Single Official ELITE ARMY Guild
INSERT INTO public.guilds (name, slug, description, glory_points)
VALUES ('ELITE ARMY', 'elite-army', 'Official ELITE Kannada Competitive Free Fire Guild', 250000)
ON CONFLICT (name) DO NOTHING;

-- Seed Leaderboard Sections
INSERT INTO public.leaderboard_sections (name, slug, icon_name, description, display_order)
VALUES
  ('OVERALL XP', 'overall-xp', 'Trophy', 'Global community player rankings based on total XP earned', 1),
  ('WEEKLY XP', 'weekly-xp', 'Flame', 'Top active warriors of the week', 2),
  ('MONTHLY XP', 'monthly-xp', 'Calendar', 'Monthly arena leaderboards', 3),
  ('STREAM XP', 'stream-xp', 'Video', 'Top stream watchers and community broadcast supporters', 4),
  ('GUILD GLORY', 'guild-glory', 'Shield', 'Official ELITE ARMY player glory rankings', 5)
ON CONFLICT (name) DO NOTHING;

-- Seed Initial Home Cards
INSERT INTO public.home_cards (section, title, subtitle, stat_number, stat_label, display_order)
VALUES
  ('HERO_STATS', '12,482+', 'REGISTERED PLAYERS', '12,482+', 'REGISTERED PLAYERS', 1),
  ('HERO_STATS', '286', 'TOURNAMENTS', '286', 'TOURNAMENTS', 2),
  ('HERO_STATS', '₹4.8L+', 'PRIZES DISTRIBUTED', '₹4.8L+', 'PRIZES DISTRIBUTED', 3),
  ('HERO_STATS', '1.2M+', 'COMMUNITY REACH', '1.2M+', 'COMMUNITY REACH', 4)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.home_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Home cards viewable by everyone" ON public.home_cards FOR SELECT USING (true);
CREATE POLICY "Admins manage home cards" ON public.home_cards FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Leaderboard sections viewable by everyone" ON public.leaderboard_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage leaderboard sections" ON public.leaderboard_sections FOR ALL USING (public.is_admin(auth.uid()));
