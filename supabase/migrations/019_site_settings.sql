-- Migration 019: Site Settings table for Guild Visibility & feature toggles

CREATE TABLE IF NOT EXISTS public.site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Seed default settings
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('show_guild_section', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site settings viewable by everyone" ON public.site_settings;
CREATE POLICY "Site settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Site settings updateable by anyone" ON public.site_settings;
CREATE POLICY "Site settings updateable by anyone" ON public.site_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Site settings insertable by anyone" ON public.site_settings;
CREATE POLICY "Site settings insertable by anyone" ON public.site_settings FOR INSERT WITH CHECK (true);
