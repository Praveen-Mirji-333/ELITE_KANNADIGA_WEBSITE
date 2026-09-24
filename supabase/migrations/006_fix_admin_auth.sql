-- 006_fix_admin_auth.sql
-- Clean up manual auth.users rows and provide robust auto-role function

-- Delete manually inserted invalid auth row if any to clear GoTrue schema error
DELETE FROM auth.users WHERE email = 'admin@elitekannadiga.com';

-- Ensure handle_new_user trigger is safe and idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_username TEXT;
BEGIN
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));

  INSERT INTO public.profiles (
    id, player_id, username, ign, free_fire_uid, avatar_url
  ) VALUES (
    NEW.id,
    v_player_id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'ign', v_username),
    COALESCE(NEW.raw_user_meta_data->>'free_fire_uid', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png')
  )
  ON CONFLICT (id) DO NOTHING;

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
  -- Prevent database trigger error from blocking signup/login
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
