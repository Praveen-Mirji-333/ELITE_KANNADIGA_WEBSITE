-- Migration 011: Add top_3_teams JSONB column to tournaments table for tournament results
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS top_3_teams JSONB DEFAULT '[]'::jsonb;

-- Ensure RLS is active and allows public read, admin update
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'Tournaments viewable by everyone'
  ) THEN
    CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'Admins manage tournaments'
  ) THEN
    CREATE POLICY "Admins manage tournaments" ON public.tournaments FOR ALL USING (public.is_admin(auth.uid()));
  END IF;
END $$;
