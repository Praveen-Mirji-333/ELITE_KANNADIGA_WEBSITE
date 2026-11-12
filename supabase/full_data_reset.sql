-- ============================================================================
-- ELITE KANNADIGA — COMPLETE DATA WIPE (PRESERVE ADMIN LOGIN ONLY)
-- Project URL: https://lmawrsmjyermswzwttbe.supabase.co
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/lmawrsmjyermswzwttbe/sql/new
--
-- WARNING: This permanently deletes ALL application data:
--   - All tournaments, matches, registrations, leagues, playoffs, and archives
--   - All non-admin user accounts (profiles + auth.users), UIDs, and avatars
--   - All Supabase Storage images (avatars, banners, uploads)
--   - All Leaderboard honors (Gun Gods / Movement Gods) & Achievement cards
--   - All Guild members, guild challenges, glory, clips, giveaways, notifications
-- Only Admin login credentials (auth.users + user_roles.role = 'admin') remain.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.factory_reset_keep_admin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_admin_ids UUID[];
  v_deleted_profiles INT := 0;
  v_deleted_auth INT := 0;
BEGIN
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_admin(auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin authorization required.');
  END IF;

  SELECT array_agg(DISTINCT user_id)
  INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No admin user found in user_roles — aborting reset to prevent lockout.'
    );
  END IF;

  -- 1. Wipe all League, Playoff, Match, and Tournament Results / Archives
  IF to_regclass('public.league_match_results') IS NOT NULL THEN
    DELETE FROM public.league_match_results;
  END IF;
  IF to_regclass('public.league_pairings') IS NOT NULL THEN
    DELETE FROM public.league_pairings;
  END IF;
  IF to_regclass('public.league_season_teams') IS NOT NULL THEN
    DELETE FROM public.league_season_teams;
  END IF;
  IF to_regclass('public.league_seasons') IS NOT NULL THEN
    DELETE FROM public.league_seasons;
  END IF;
  IF to_regclass('public.tournament_matches') IS NOT NULL THEN
    DELETE FROM public.tournament_matches;
  END IF;
  IF to_regclass('public.tournament_registrations') IS NOT NULL THEN
    DELETE FROM public.tournament_registrations;
  END IF;
  IF to_regclass('public.tournament_archives') IS NOT NULL THEN
    DELETE FROM public.tournament_archives;
  END IF;
  IF to_regclass('public.tournaments') IS NOT NULL THEN
    DELETE FROM public.tournaments;
  END IF;

  -- 2. Wipe Guild Roster, Guild Challenges & Reset Guild Counters
  IF to_regclass('public.guild_challenges') IS NOT NULL THEN
    DELETE FROM public.guild_challenges;
  END IF;
  IF to_regclass('public.guild_members') IS NOT NULL THEN
    DELETE FROM public.guild_members;
  END IF;
  IF to_regclass('public.guilds') IS NOT NULL THEN
    UPDATE public.guilds
    SET leader_id = NULL,
        glory_points = 0;
  END IF;

  -- 3. Wipe Honors (Gun Gods / Movement Gods), Achievements, Activity, Giveaways, Clips
  IF to_regclass('public.player_honors') IS NOT NULL THEN
    DELETE FROM public.player_honors;
  END IF;
  IF to_regclass('public.user_achievements') IS NOT NULL THEN
    DELETE FROM public.user_achievements;
  END IF;
  IF to_regclass('public.achievements') IS NOT NULL THEN
    DELETE FROM public.achievements;
  END IF;
  IF to_regclass('public.xp_transactions') IS NOT NULL THEN
    DELETE FROM public.xp_transactions;
  END IF;
  IF to_regclass('public.daily_activity') IS NOT NULL THEN
    DELETE FROM public.daily_activity;
  END IF;
  IF to_regclass('public.giveaway_winners') IS NOT NULL THEN
    DELETE FROM public.giveaway_winners;
  END IF;
  IF to_regclass('public.giveaway_entries') IS NOT NULL THEN
    DELETE FROM public.giveaway_entries;
  END IF;
  IF to_regclass('public.giveaways') IS NOT NULL THEN
    DELETE FROM public.giveaways;
  END IF;
  IF to_regclass('public.qna_attempts') IS NOT NULL THEN
    DELETE FROM public.qna_attempts;
  END IF;
  IF to_regclass('public.qna_questions') IS NOT NULL THEN
    DELETE FROM public.qna_questions;
  END IF;
  IF to_regclass('public.community_clips') IS NOT NULL THEN
    DELETE FROM public.community_clips;
  END IF;
  IF to_regclass('public.announcements') IS NOT NULL THEN
    DELETE FROM public.announcements;
  END IF;
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications;
  END IF;
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DELETE FROM public.audit_logs;
  END IF;
  IF to_regclass('public.home_cards') IS NOT NULL THEN
    DELETE FROM public.home_cards;
  END IF;

  -- 4. Clear stored JSON state in site_settings & reset counters in site_stats
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    DELETE FROM public.site_settings
    WHERE setting_key IN (
      'archived_tournaments',
      'live_tournament_id',
      'guild_member_meta',
      'guild_challenges_data'
    )
    OR setting_key LIKE 'league_playoffs_%';
  END IF;
  IF to_regclass('public.site_stats') IS NOT NULL THEN
    UPDATE public.site_stats SET stat_value = 0;
  END IF;

  -- 5. Delete all non-admin users from user_roles, profiles, and auth.users
  -- Note: Supabase protects `storage.objects` with `protect_delete()`, so uploaded
  -- Storage bucket files must be deleted via Supabase Dashboard -> Storage -> Empty bucket
  -- or via the Storage API from the Admin panel.
  DELETE FROM public.user_roles WHERE NOT (user_id = ANY(v_admin_ids));

  -- Clear player UID/avatar/stats and hide preserved admin profiles from public leaderboards
  UPDATE public.profiles
  SET free_fire_uid = NULL,
      avatar_url = NULL,
      banner_url = NULL,
      bio = NULL,
      guild_id = NULL,
      total_xp = 0,
      level = 1,
      login_streak = 0,
      longest_login_streak = 0,
      last_login_date = NULL,
      is_public = false
  WHERE id = ANY(v_admin_ids);

  DELETE FROM public.profiles WHERE NOT (id = ANY(v_admin_ids));
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  DELETE FROM auth.users WHERE NOT (id = ANY(v_admin_ids));
  GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_profiles', v_deleted_profiles,
    'deleted_auth_users', v_deleted_auth,
    'preserved_admins', array_length(v_admin_ids, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.factory_reset_keep_admin() TO authenticated;

-- Immediately execute the complete reset
SELECT public.factory_reset_keep_admin();

