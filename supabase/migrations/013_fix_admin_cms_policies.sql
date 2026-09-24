-- Migration 013: Fix RLS policies for achievements and CMS tables

-- 1. achievements table policies
DROP POLICY IF EXISTS "Anyone can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can delete achievements" ON public.achievements;

CREATE POLICY "Anyone can insert achievements" ON public.achievements FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update achievements" ON public.achievements FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete achievements" ON public.achievements FOR DELETE TO public USING (true);

-- 2. home_cards table policies
DROP POLICY IF EXISTS "Anyone can insert home_cards" ON public.home_cards;
DROP POLICY IF EXISTS "Anyone can update home_cards" ON public.home_cards;
DROP POLICY IF EXISTS "Anyone can delete home_cards" ON public.home_cards;

CREATE POLICY "Anyone can insert home_cards" ON public.home_cards FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update home_cards" ON public.home_cards FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete home_cards" ON public.home_cards FOR DELETE TO public USING (true);

-- 3. leaderboard_sections table policies
DROP POLICY IF EXISTS "Anyone can insert leaderboard_sections" ON public.leaderboard_sections;
DROP POLICY IF EXISTS "Anyone can update leaderboard_sections" ON public.leaderboard_sections;
DROP POLICY IF EXISTS "Anyone can delete leaderboard_sections" ON public.leaderboard_sections;

CREATE POLICY "Anyone can insert leaderboard_sections" ON public.leaderboard_sections FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update leaderboard_sections" ON public.leaderboard_sections FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete leaderboard_sections" ON public.leaderboard_sections FOR DELETE TO public USING (true);

-- 4. guild_members table policies
DROP POLICY IF EXISTS "Anyone can insert guild_members" ON public.guild_members;
DROP POLICY IF EXISTS "Anyone can update guild_members" ON public.guild_members;
DROP POLICY IF EXISTS "Anyone can delete guild_members" ON public.guild_members;

CREATE POLICY "Anyone can insert guild_members" ON public.guild_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update guild_members" ON public.guild_members FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete guild_members" ON public.guild_members FOR DELETE TO public USING (true);

-- 5. tournaments table policies
DROP POLICY IF EXISTS "Anyone can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can delete tournaments" ON public.tournaments;

CREATE POLICY "Anyone can insert tournaments" ON public.tournaments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update tournaments" ON public.tournaments FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete tournaments" ON public.tournaments FOR DELETE TO public USING (true);
