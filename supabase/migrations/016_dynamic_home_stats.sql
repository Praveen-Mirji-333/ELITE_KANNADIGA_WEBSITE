-- Migration 016: Dynamic Home Stats & Page Visit Tracking

CREATE TABLE IF NOT EXISTS public.site_stats (
  stat_key TEXT PRIMARY KEY,
  stat_value BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Seed initial counts
INSERT INTO public.site_stats (stat_key, stat_value)
VALUES 
  ('total_visits', 1),
  ('login_visits', 1)
ON CONFLICT (stat_key) DO NOTHING;

-- Function to increment visits
CREATE OR REPLACE FUNCTION public.increment_site_visits(p_is_login BOOLEAN DEFAULT false)
RETURNS BIGINT AS $$
DECLARE
  v_visits BIGINT;
BEGIN
  UPDATE public.site_stats
  SET stat_value = stat_value + 1, updated_at = NOW()
  WHERE stat_key = 'total_visits'
  RETURNING stat_value INTO v_visits;

  IF v_visits IS NULL THEN
    INSERT INTO public.site_stats (stat_key, stat_value)
    VALUES ('total_visits', 1)
    RETURNING stat_value INTO v_visits;
  END IF;

  IF p_is_login THEN
    UPDATE public.site_stats
    SET stat_value = stat_value + 1, updated_at = NOW()
    WHERE stat_key = 'login_visits';

    IF NOT FOUND THEN
      INSERT INTO public.site_stats (stat_key, stat_value)
      VALUES ('login_visits', 1);
    END IF;
  END IF;

  RETURN v_visits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, UPDATE, INSERT ON public.site_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_site_visits(BOOLEAN) TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Site stats viewable by everyone" ON public.site_stats;
CREATE POLICY "Site stats viewable by everyone" ON public.site_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Site stats updateable by anyone" ON public.site_stats;
CREATE POLICY "Site stats updateable by anyone" ON public.site_stats FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Site stats insertable by anyone" ON public.site_stats;
CREATE POLICY "Site stats insertable by anyone" ON public.site_stats FOR INSERT WITH CHECK (true);
