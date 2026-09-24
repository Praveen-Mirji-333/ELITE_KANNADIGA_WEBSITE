-- 007_admin_praveen.sql
-- Explicitly grant admin role to praveenmirji866@gmail.com and update handle_new_user trigger

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

  -- Assign admin role automatically if email is praveenmirji866@gmail.com OR starts/contains admin
  IF NEW.email ILIKE 'praveenmirji866@gmail.com' 
     OR NEW.email ILIKE 'admin@%' 
     OR NEW.email ILIKE '%admin%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
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

-- Upgrade any existing user with email praveenmirji866@gmail.com to admin role
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'praveenmirji866@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
  END IF;
END $$;
