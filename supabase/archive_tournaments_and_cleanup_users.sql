-- ============================================================================
-- ELITE KANNADIGA — COMPLETED TOURNAMENT ARCHIVE & SAFE NON-ADMIN USER PURGE
-- Project URL: https://lmawrsmjyermswzwttbe.supabase.co
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/lmawrsmjyermswzwttbe/sql/new
--
-- What this script does safely:
--   1. Creates `public.tournament_archives` — a separate, permanent table
--      storing finished tournaments (Season 1, Season 2, and any future
--      completed tournaments) with their Top 3 podium, Champions banner,
--      Victory BGM, ALL registered teams & final standings, and player avatars.
--   2. Converts user foreign keys (`tournament_registrations.user_id`, etc.)
--      from `ON DELETE CASCADE` to `ON DELETE SET NULL` so deleting users NEVER
--      cascades or deletes tournament data or standings.
--   3. Archives all completed tournaments (including Season 1 & Season 2) BEFORE
--      deleting any user rows, and unlinks `user_id` on completed registrations.
--   4. Safely deletes all non-admin users from `public.profiles` and
--      `auth.users`, preserving every account with `user_roles.role = 'admin'`.
-- ============================================================================

-- 1. Create dedicated archive table for finished tournaments (independent of users/profiles)
CREATE TABLE IF NOT EXISTS public.tournament_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID UNIQUE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  banner_url TEXT,
  game_mode TEXT DEFAULT 'SQUAD BATTLE' NOT NULL,
  map TEXT DEFAULT 'BERMUDA' NOT NULL,
  tournament_type TEXT DEFAULT 'FREE',
  entry_type TEXT DEFAULT 'SQUAD',
  prize_pool TEXT DEFAULT '₹10,000' NOT NULL,
  max_slots INTEGER DEFAULT 100 NOT NULL,
  slots_filled INTEGER DEFAULT 0 NOT NULL,
  tournament_start TIMESTAMPTZ,
  status TEXT DEFAULT 'completed' NOT NULL,
  rules TEXT,
  champions_image_url TEXT,
  results_bgm_url TEXT,
  top_3_teams JSONB DEFAULT '[]'::jsonb,
  registrations_snapshot JSONB DEFAULT '[]'::jsonb,
  player_avatars JSONB DEFAULT '{}'::jsonb,
  league_snapshot JSONB,
  playoff_snapshot JSONB,
  archived_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournament_archives_start
  ON public.tournament_archives (tournament_start DESC);

ALTER TABLE public.tournament_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament archives viewable by everyone" ON public.tournament_archives;
CREATE POLICY "Tournament archives viewable by everyone"
  ON public.tournament_archives FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage tournament archives" ON public.tournament_archives;
CREATE POLICY "Admins manage tournament archives"
  ON public.tournament_archives FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Decouple user foreign keys from ON DELETE CASCADE so completed/existing tournament
--    records never vanish when user accounts are deleted.
DO $$
DECLARE
  v_con RECORD;
BEGIN
  -- Make tournament_registrations.user_id nullable
  ALTER TABLE public.tournament_registrations
    ALTER COLUMN user_id DROP NOT NULL;

  -- Replace any FK on tournament_registrations(user_id) with ON DELETE SET NULL
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tournament_registrations'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%(user_id)%'
  LOOP
    EXECUTE format('ALTER TABLE public.tournament_registrations DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

  -- Drop any legacy global single-column unique constraints on user_id / captain_free_fire_uid
  -- so former tournament players never hit registration conflicts in new tournaments
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tournament_registrations'::regclass
      AND contype = 'u'
      AND (
        pg_get_constraintdef(oid) ILIKE 'UNIQUE (captain_free_fire_uid)'
        OR pg_get_constraintdef(oid) ILIKE 'UNIQUE (user_id)'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.tournament_registrations DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  -- Fix tournaments.created_by -> ON DELETE SET NULL
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tournaments'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%(created_by)%'
  LOOP
    EXECUTE format('ALTER TABLE public.tournaments DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

  -- Fix guilds.leader_id -> ON DELETE SET NULL
  IF to_regclass('public.guilds') IS NOT NULL THEN
    FOR v_con IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.guilds'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) ILIKE '%(leader_id)%'
    LOOP
      EXECUTE format('ALTER TABLE public.guilds DROP CONSTRAINT %I', v_con.conname);
    END LOOP;

    ALTER TABLE public.guilds
      ADD CONSTRAINT guilds_leader_id_fkey
      FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Fix announcements.created_by -> ON DELETE SET NULL
  IF to_regclass('public.announcements') IS NOT NULL THEN
    FOR v_con IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.announcements'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) ILIKE '%(created_by)%'
    LOOP
      EXECUTE format('ALTER TABLE public.announcements DROP CONSTRAINT %I', v_con.conname);
    END LOOP;

    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Fix audit_logs.actor_id -> ON DELETE SET NULL
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    FOR v_con IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.audit_logs'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) ILIKE '%(actor_id)%'
    LOOP
      EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT %I', v_con.conname);
    END LOOP;

    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Snapshot helper: archive any completed tournament + all team standings & avatars
CREATE OR REPLACE FUNCTION public.archive_completed_tournament(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t JSONB;
  v_regs JSONB := '[]'::jsonb;
  v_avatars JSONB := '{}'::jsonb;
  v_league JSONB := NULL;
  v_playoff JSONB := NULL;
  v_slots_filled INT := 0;
  v_existing_regs JSONB := '[]'::jsonb;
  v_existing_slots INT := 0;
  v_existing_avatars JSONB := '{}'::jsonb;
  v_existing_champ_img TEXT := NULL;
  v_existing_bgm TEXT := NULL;
  v_top3 JSONB := '[]'::jsonb;
BEGIN
  SELECT to_jsonb(t) INTO v_t
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;

  IF v_t IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Collect registrations (ordered by placement, verified, created_at)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'tournament_id', r.tournament_id,
        'team_name', r.team_name,
        'captain_name', r.captain_name,
        'captain_free_fire_uid', r.captain_free_fire_uid,
        'teammate_names', COALESCE(to_jsonb(r.teammate_names), '[]'::jsonb),
        'teammate_uids', COALESCE(to_jsonb(r.teammate_uids), '[]'::jsonb),
        'registration_status', COALESCE(r.registration_status, 'confirmed'),
        'registered_at', r.registered_at,
        'placement', r.placement,
        'kills', COALESCE(r.kills, 0),
        'result_verified', COALESCE(r.result_verified, false)
      )
      ORDER BY COALESCE(r.placement, 9999) ASC, r.created_at ASC
    ),
    '[]'::jsonb
  ),
  COUNT(*)::INT
  INTO v_regs, v_slots_filled
  FROM public.tournament_registrations r
  WHERE r.tournament_id = p_tournament_id;

  -- Preserve existing archived registrations & avatars if live rows were already emptied
  SELECT
    COALESCE(registrations_snapshot, '[]'::jsonb),
    COALESCE(slots_filled, 0),
    COALESCE(player_avatars, '{}'::jsonb),
    champions_image_url,
    results_bgm_url
  INTO
    v_existing_regs,
    v_existing_slots,
    v_existing_avatars,
    v_existing_champ_img,
    v_existing_bgm
  FROM public.tournament_archives
  WHERE tournament_id = p_tournament_id;

  IF v_slots_filled = 0 AND jsonb_array_length(COALESCE(v_existing_regs, '[]'::jsonb)) > 0 THEN
    v_regs := v_existing_regs;
    v_slots_filled := GREATEST(v_existing_slots, jsonb_array_length(v_existing_regs));
  END IF;

  -- Preserve current avatar URLs mapped by lowercased UID and IGN from profiles
  SELECT COALESCE(
    jsonb_object_agg(k, avatar_url),
    '{}'::jsonb
  ) INTO v_avatars
  FROM (
    SELECT DISTINCT lower(trim(free_fire_uid)) AS k, avatar_url
    FROM public.profiles
    WHERE free_fire_uid IS NOT NULL AND trim(free_fire_uid) <> ''
      AND avatar_url IS NOT NULL AND trim(avatar_url) <> ''
    UNION
    SELECT DISTINCT lower(trim(ign)) AS k, avatar_url
    FROM public.profiles
    WHERE ign IS NOT NULL AND trim(ign) <> ''
      AND avatar_url IS NOT NULL AND trim(avatar_url) <> ''
  ) av;

  v_avatars := COALESCE(v_existing_avatars, '{}'::jsonb) || COALESCE(v_avatars, '{}'::jsonb);

  -- Capture full league & playoff snapshots (seasons, teams, pairings, results) so archived tournaments act as static data
  IF to_regclass('public.league_seasons') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'seasons', COALESCE((
        SELECT jsonb_agg(to_jsonb(ls) ORDER BY ls.season_number)
        FROM public.league_seasons ls
        WHERE ls.tournament_id = p_tournament_id
      ), '[]'::jsonb),
      'teamsBySeason', COALESCE((
        SELECT jsonb_object_agg(season_id::text, teams_arr)
        FROM (
          SELECT
            lst.season_id,
            jsonb_agg(
              jsonb_build_object(
                'id', lst.id,
                'season_id', lst.season_id,
                'registration_id', lst.registration_id,
                'status', lst.status,
                'team_name', COALESCE(NULLIF(trim(tr.team_name), ''), tr.captain_name, 'Unnamed Team'),
                'captain_name', tr.captain_name,
                'created_at', lst.created_at
              )
              ORDER BY lst.created_at ASC
            ) AS teams_arr
          FROM public.league_season_teams lst
          JOIN public.league_seasons ls ON ls.id = lst.season_id
          LEFT JOIN public.tournament_registrations tr ON tr.id = lst.registration_id
          WHERE ls.tournament_id = p_tournament_id
          GROUP BY lst.season_id
        ) sub_t
      ), '{}'::jsonb),
      'pairingsBySeason', COALESCE((
        SELECT jsonb_object_agg(season_id::text, pairings_arr)
        FROM (
          SELECT
            lp.season_id,
            jsonb_agg(to_jsonb(lp) ORDER BY lp.round_number ASC, lp.match_number ASC) AS pairings_arr
          FROM public.league_pairings lp
          JOIN public.league_seasons ls ON ls.id = lp.season_id
          WHERE ls.tournament_id = p_tournament_id
          GROUP BY lp.season_id
        ) sub_p
      ), '{}'::jsonb),
      'resultsBySeason', COALESCE((
        SELECT jsonb_object_agg(season_id::text, results_arr)
        FROM (
          SELECT
            lmr.season_id,
            jsonb_agg(to_jsonb(lmr)) AS results_arr
          FROM public.league_match_results lmr
          JOIN public.league_seasons ls ON ls.id = lmr.season_id
          WHERE ls.tournament_id = p_tournament_id
          GROUP BY lmr.season_id
        ) sub_r
      ), '{}'::jsonb)
    ) INTO v_league;

    IF to_regclass('public.site_settings') IS NOT NULL THEN
      SELECT jsonb_object_agg(ls.id::text, ss.setting_value::jsonb)
      INTO v_playoff
      FROM public.league_seasons ls
      JOIN public.site_settings ss
        ON ss.setting_key = 'league_playoffs_' || ls.id::text
      WHERE ls.tournament_id = p_tournament_id
        AND ss.setting_value IS NOT NULL
        AND trim(ss.setting_value) <> ''
        AND trim(ss.setting_value) <> 'null';
    END IF;
  END IF;

  v_top3 := COALESCE(v_t->'top_3_teams', '[]'::jsonb);

  INSERT INTO public.tournament_archives (
    tournament_id,
    title,
    slug,
    description,
    banner_url,
    game_mode,
    map,
    tournament_type,
    entry_type,
    prize_pool,
    max_slots,
    slots_filled,
    tournament_start,
    status,
    rules,
    champions_image_url,
    results_bgm_url,
    top_3_teams,
    registrations_snapshot,
    player_avatars,
    league_snapshot,
    playoff_snapshot,
    updated_at
  )
  VALUES (
    p_tournament_id,
    COALESCE(v_t->>'title', 'Tournament'),
    v_t->>'slug',
    v_t->>'description',
    v_t->>'banner_url',
    COALESCE(v_t->>'game_mode', 'SQUAD BATTLE'),
    COALESCE(v_t->>'map', 'BERMUDA'),
    v_t->>'tournament_type',
    v_t->>'entry_type',
    COALESCE(v_t->>'prize_pool', '₹10,000'),
    COALESCE((v_t->>'max_slots')::INT, 100),
    v_slots_filled,
    NULLIF(v_t->>'tournament_start', '')::TIMESTAMPTZ,
    COALESCE(v_t->>'status', 'completed'),
    v_t->>'rules',
    COALESCE(v_t->>'champions_image_url', v_top3->0->>'champions_image_url', v_existing_champ_img),
    COALESCE(v_t->>'results_bgm_url', v_top3->0->>'results_bgm_url', v_existing_bgm),
    v_top3,
    v_regs,
    v_avatars,
    v_league,
    v_playoff,
    timezone('utc'::text, now())
  )
  ON CONFLICT (tournament_id) DO UPDATE SET
    title = EXCLUDED.title,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    banner_url = EXCLUDED.banner_url,
    game_mode = EXCLUDED.game_mode,
    map = EXCLUDED.map,
    tournament_type = EXCLUDED.tournament_type,
    entry_type = EXCLUDED.entry_type,
    prize_pool = EXCLUDED.prize_pool,
    max_slots = EXCLUDED.max_slots,
    slots_filled = EXCLUDED.slots_filled,
    tournament_start = EXCLUDED.tournament_start,
    status = EXCLUDED.status,
    rules = EXCLUDED.rules,
    champions_image_url = COALESCE(EXCLUDED.champions_image_url, public.tournament_archives.champions_image_url),
    results_bgm_url = COALESCE(EXCLUDED.results_bgm_url, public.tournament_archives.results_bgm_url),
    top_3_teams = CASE
      WHEN jsonb_array_length(COALESCE(EXCLUDED.top_3_teams, '[]'::jsonb)) > 0 THEN EXCLUDED.top_3_teams
      ELSE public.tournament_archives.top_3_teams
    END,
    registrations_snapshot = CASE
      WHEN jsonb_array_length(COALESCE(EXCLUDED.registrations_snapshot, '[]'::jsonb)) > 0 THEN EXCLUDED.registrations_snapshot
      ELSE public.tournament_archives.registrations_snapshot
    END,
    player_avatars = COALESCE(public.tournament_archives.player_avatars, '{}'::jsonb) || COALESCE(EXCLUDED.player_avatars, '{}'::jsonb),
    league_snapshot = CASE
      WHEN jsonb_array_length(COALESCE(EXCLUDED.league_snapshot->'seasons', '[]'::jsonb)) > 0
       AND (
         public.tournament_archives.league_snapshot IS NULL
         OR public.tournament_archives.league_snapshot->'teamsBySeason' IS NULL
         OR COALESCE(EXCLUDED.league_snapshot->'teamsBySeason', '{}'::jsonb) <> '{}'::jsonb
       )
      THEN EXCLUDED.league_snapshot
      ELSE COALESCE(public.tournament_archives.league_snapshot, EXCLUDED.league_snapshot)
    END,
    playoff_snapshot = COALESCE(EXCLUDED.playoff_snapshot, public.tournament_archives.playoff_snapshot),
    updated_at = timezone('utc'::text, now());

  -- For completed tournaments, safely remove live rows from tournament_registrations
  -- now that static snapshot (registrations_snapshot + top_3_teams + league_snapshot) is stored in tournament_archives.
  -- This ensures completed tournament players never leak into other queries or cause registration conflicts.
  IF v_t->>'status' = 'completed'
     AND EXISTS (SELECT 1 FROM public.tournament_archives WHERE tournament_id = p_tournament_id) THEN
    DELETE FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id;
  ELSE
    UPDATE public.tournament_registrations
    SET user_id = NULL
    WHERE tournament_id = p_tournament_id
      AND user_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'title', v_t->>'title',
    'teams_archived', v_slots_filled
  );
END;
$$;

-- 4. Auto-archive trigger whenever a tournament is marked 'completed'
CREATE OR REPLACE FUNCTION public.trg_auto_archive_completed_tournament()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    PERFORM public.archive_completed_tournament(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_archive_completed_tournament ON public.tournaments;
CREATE TRIGGER auto_archive_completed_tournament
  AFTER INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.trg_auto_archive_completed_tournament();

-- 5. Safe non-admin user purge RPC (preserves admins + all archived completed tournaments)
CREATE OR REPLACE FUNCTION public.purge_non_admin_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_ids UUID[];
  v_t RECORD;
  v_archived_count INT := 0;
  v_deleted_profiles INT := 0;
  v_deleted_auth INT := 0;
BEGIN
  -- Authorize caller (either SQL Editor superuser or authenticated site admin)
  IF NOT (
    current_user IN ('postgres', 'supabase_admin')
    OR public.is_admin(auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin authorization required.');
  END IF;

  -- Identify all admin accounts from user_roles (and current caller if admin)
  SELECT array_agg(DISTINCT user_id)
  INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No admin user found in user_roles — aborting user purge to prevent lockout.'
    );
  END IF;

  -- Step A: Archive ALL completed tournaments (e.g. Season 1 & Season 2) before deleting any user
  FOR v_t IN
    SELECT id FROM public.tournaments WHERE status = 'completed'
  LOOP
    PERFORM public.archive_completed_tournament(v_t.id);
    v_archived_count := v_archived_count + 1;
  END LOOP;

  -- Step B: Unlink nullable references for non-admin users so history tables stay intact
  UPDATE public.tournament_registrations
  SET user_id = NULL
  WHERE user_id IS NOT NULL
    AND NOT (user_id = ANY(v_admin_ids));

  UPDATE public.tournaments
  SET created_by = NULL
  WHERE created_by IS NOT NULL
    AND NOT (created_by = ANY(v_admin_ids));

  IF to_regclass('public.guilds') IS NOT NULL THEN
    UPDATE public.guilds
    SET leader_id = NULL
    WHERE leader_id IS NOT NULL
      AND NOT (leader_id = ANY(v_admin_ids));
  END IF;

  IF to_regclass('public.announcements') IS NOT NULL THEN
    UPDATE public.announcements
    SET created_by = NULL
    WHERE created_by IS NOT NULL
      AND NOT (created_by = ANY(v_admin_ids));
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    UPDATE public.audit_logs
    SET actor_id = NULL
    WHERE actor_id IS NOT NULL
      AND NOT (actor_id = ANY(v_admin_ids));
  END IF;

  -- Step C: Delete non-admin personal activity & profiles
  IF to_regclass('public.xp_transactions') IS NOT NULL THEN
    DELETE FROM public.xp_transactions WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.user_achievements') IS NOT NULL THEN
    DELETE FROM public.user_achievements WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.daily_activity') IS NOT NULL THEN
    DELETE FROM public.daily_activity WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.giveaway_entries') IS NOT NULL THEN
    DELETE FROM public.giveaway_entries WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.giveaway_winners') IS NOT NULL THEN
    DELETE FROM public.giveaway_winners WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.qna_attempts') IS NOT NULL THEN
    DELETE FROM public.qna_attempts WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.community_clips') IS NOT NULL THEN
    DELETE FROM public.community_clips WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;
  IF to_regclass('public.guild_members') IS NOT NULL THEN
    DELETE FROM public.guild_members WHERE NOT (user_id = ANY(v_admin_ids));
  END IF;

  -- Clean Leaderboard honors (Gun Gods / Movement Gods) belonging to deleted non-admin users
  IF to_regclass('public.player_honors') IS NOT NULL THEN
    DELETE FROM public.player_honors h
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ANY(v_admin_ids)
        AND p.free_fire_uid IS NOT NULL
        AND trim(p.free_fire_uid) <> ''
        AND trim(p.free_fire_uid) = trim(COALESCE(h.player_uid, ''))
    );
  END IF;

  -- Clean player-assigned cards in Achievements belonging to deleted non-admin users
  IF to_regclass('public.achievements') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'player_uid'
     ) THEN
    DELETE FROM public.achievements a
    WHERE (
      (a.player_uid IS NOT NULL AND trim(a.player_uid) <> '')
      OR (a.player_name IS NOT NULL AND trim(a.player_name) <> '')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ANY(v_admin_ids)
        AND (
          (a.player_uid IS NOT NULL AND trim(COALESCE(p.free_fire_uid, '')) = trim(a.player_uid))
          OR (a.player_name IS NOT NULL AND lower(trim(COALESCE(p.ign, p.username, ''))) = lower(trim(a.player_name)))
        )
    );
  END IF;

  DELETE FROM public.user_roles WHERE NOT (user_id = ANY(v_admin_ids));

  DELETE FROM public.profiles WHERE NOT (id = ANY(v_admin_ids));
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  -- Step D: Delete non-admin accounts from Supabase Auth (auth.users)
  DELETE FROM auth.users WHERE NOT (id = ANY(v_admin_ids));
  GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'archived_tournaments', v_archived_count,
    'deleted_profiles', v_deleted_profiles,
    'deleted_auth_users', v_deleted_auth,
    'preserved_admins', array_length(v_admin_ids, 1)
  );
END;
$$;

-- 6. Immediately archive Season 1 & Season 2 (and all completed tournaments) and purge dummy/non-admin users
SELECT public.purge_non_admin_users();
