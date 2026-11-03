-- ============================================================
-- ELITE KANNADIGA — TOURNAMENT RESULTS & MEDIA MIGRATION
-- Run this in the Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run multiple times.
-- ============================================================

-- 1. Ensure columns exist on tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS top_3_teams JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS champions_image_url TEXT;

ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS results_bgm_url TEXT;

-- 2. Add comments for clarity
COMMENT ON COLUMN public.tournaments.top_3_teams IS 'Stores rank, team_name, captain, kills, points, prize, player_names, and player_uids for top 3 podium squads';
COMMENT ON COLUMN public.tournaments.champions_image_url IS 'Banner artwork or device-uploaded photo displayed at the top of results modal';
COMMENT ON COLUMN public.tournaments.results_bgm_url IS 'Audio track / anthem url uploaded or selected by admin that autoplays when users open the tournament results';

