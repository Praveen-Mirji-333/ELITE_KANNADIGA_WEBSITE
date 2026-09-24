-- Migration 015: UID-based auth support and profiles index
-- Ensure fast lookup by Free Fire UID and update trigger to sync profile free_fire_uid

CREATE INDEX IF NOT EXISTS idx_profiles_free_fire_uid ON public.profiles(free_fire_uid);

-- Ensure handle_new_user handles raw_user_meta_data for free_fire_uid and ign properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_username TEXT;
  v_ign TEXT;
  v_uid TEXT;
BEGIN
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_ign := COALESCE(NEW.raw_user_meta_data->>'ign', v_username);
  v_uid := COALESCE(NEW.raw_user_meta_data->>'free_fire_uid', '');

  INSERT INTO public.profiles (
    id, player_id, username, ign, free_fire_uid, avatar_url
  ) VALUES (
    NEW.id,
    v_player_id,
    v_username,
    v_ign,
    v_uid,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png')
  )
  ON CONFLICT (id) DO UPDATE SET
    free_fire_uid = CASE WHEN EXCLUDED.free_fire_uid <> '' THEN EXCLUDED.free_fire_uid ELSE public.profiles.free_fire_uid END,
    ign = CASE WHEN EXCLUDED.ign <> '' THEN EXCLUDED.ign ELSE public.profiles.ign END;

  -- Assign admin role automatically if email contains 'admin@' or is specified admin email
  IF NEW.email ILIKE 'admin@%' OR NEW.email ILIKE '%admin%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
