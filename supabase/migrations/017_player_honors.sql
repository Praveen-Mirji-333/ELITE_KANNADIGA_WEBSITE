-- Migration 017: Player Honors for Gun Gods and Movement Gods Leaderboards

CREATE TABLE IF NOT EXISTS public.player_honors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('gun_gods', 'movement_gods')),
  player_uid TEXT NOT NULL,
  player_name TEXT NOT NULL,
  title_name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS policies
ALTER TABLE public.player_honors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player honors viewable by everyone" ON public.player_honors;
CREATE POLICY "Player honors viewable by everyone" ON public.player_honors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage player honors" ON public.player_honors;
CREATE POLICY "Admins manage player honors" ON public.player_honors FOR ALL USING (public.is_admin(auth.uid()));

-- Seed initial sample Gun Gods and Movement Gods
INSERT INTO public.player_honors (category, player_uid, player_name, title_name, description, display_order)
VALUES
  ('gun_gods', '1928374650', 'ELITE_RAHUL', 'M1887 One-Tap King', 'Dominates 1v1 custom rooms with devastating close-range headshot accuracy.', 1),
  ('gun_gods', '9876543210', 'KANNADA_KING', 'AWM Sniper God', 'Long-range sniper specialist with 95% headshot accuracy in tournament finals.', 2),
  ('movement_gods', '4567891230', 'SHADOW_77', '360 Gloo Wall Fast Dash', 'Lightning fast gloo wall placement and unpredictable zig-zag rush movements.', 1),
  ('movement_gods', '7891234560', 'BL4CK_HAWK', 'Speed Jump Shot Master', 'Extreme agility and jump-shot precision under heavy enemy pressure.', 2)
ON CONFLICT DO NOTHING;
