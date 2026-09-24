-- Migration 018: Fix RLS Policies for player_honors table to ensure delete operations succeed

ALTER TABLE public.player_honors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player honors viewable by everyone" ON public.player_honors;
CREATE POLICY "Player honors viewable by everyone" ON public.player_honors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Player honors insertable by anyone" ON public.player_honors;
CREATE POLICY "Player honors insertable by anyone" ON public.player_honors FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Player honors updateable by anyone" ON public.player_honors;
CREATE POLICY "Player honors updateable by anyone" ON public.player_honors FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Player honors deleteable by anyone" ON public.player_honors;
CREATE POLICY "Player honors deleteable by anyone" ON public.player_honors FOR DELETE USING (true);
