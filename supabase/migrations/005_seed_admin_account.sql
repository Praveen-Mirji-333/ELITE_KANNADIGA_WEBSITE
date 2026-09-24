-- 005_seed_admin_account.sql
-- Seed default Admin user into auth.users, profiles, and user_roles

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@elitekannadiga.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@elitekannadiga.com',
      extensions.crypt('AdminPassword123!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"ign":"ELITE_ADMIN","free_fire_uid":"999999999","username":"ELITE_ADMIN"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, 'admin@elitekannadiga.com')::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (
    id, player_id, username, ign, free_fire_uid, total_xp, level
  ) VALUES (
    v_user_id, 'ELITE-ADMIN01', 'ELITE_ADMIN', 'ELITE_ADMIN', '999999999', 50000, 50
  ) ON CONFLICT (id) DO UPDATE SET total_xp = 50000, level = 50;

  -- Assign admin role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
