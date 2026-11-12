-- ============================================================
-- ELITE KANNADIGA — GUILD RANK CHALLENGES MIGRATION (OPTIONAL)
-- Run in Supabase SQL Editor if you want a dedicated table;
-- otherwise the app automatically stores challenges in site_settings.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guild_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  challenger_member_id TEXT NOT NULL,
  challenger_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  challenger_name TEXT NOT NULL,
  challenger_uid TEXT,
  challenger_role TEXT NOT NULL,
  challenger_glory INTEGER NOT NULL DEFAULT 0,
  defender_member_id TEXT NOT NULL,
  defender_user_id TEXT NOT NULL,
  defender_name TEXT NOT NULL,
  defender_uid TEXT,
  defender_role TEXT NOT NULL,
  defender_glory INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'challenger_won', 'defender_won', 'declined')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guild_challenges_guild ON public.guild_challenges(guild_id, created_at DESC);

ALTER TABLE public.guild_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild challenges viewable by everyone" ON public.guild_challenges;
CREATE POLICY "Guild challenges viewable by everyone"
  ON public.guild_challenges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated guild members can insert challenges" ON public.guild_challenges;
CREATE POLICY "Authenticated guild members can insert challenges"
  ON public.guild_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = challenger_user_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Defenders or admins can update challenges" ON public.guild_challenges;
CREATE POLICY "Defenders or admins can update challenges"
  ON public.guild_challenges FOR UPDATE
  USING (
    auth.uid()::text = defender_user_id
    OR auth.uid() = challenger_user_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete challenges" ON public.guild_challenges;
CREATE POLICY "Admins can delete challenges"
  ON public.guild_challenges FOR DELETE
  USING (public.is_admin(auth.uid()));

