-- Migration 020: Unique Game UID Constraint & Avatars Storage Bucket

-- 1. Unique index on free_fire_uid in profiles table
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_free_fire_uid 
ON public.profiles(LOWER(TRIM(free_fire_uid))) 
WHERE free_fire_uid IS NOT NULL AND TRIM(free_fire_uid) <> '';

-- 2. Update create_player_account RPC to safely handle GoTrue token columns and pre-existing profiles
CREATE OR REPLACE FUNCTION public.create_player_account(
  p_email TEXT,
  p_password TEXT,
  p_ign TEXT DEFAULT '',
  p_uid TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_existing_id UUID;
  v_clean_uid TEXT;
  v_existing_prof_id UUID;
BEGIN
  v_clean_uid := LOWER(TRIM(p_uid));

  -- Check if user already exists in auth.users by email
  SELECT id INTO v_existing_id FROM auth.users WHERE email = LOWER(p_email);

  -- Or check if user exists in auth.users by free_fire_uid in raw_user_meta_data
  IF v_existing_id IS NULL AND v_clean_uid <> '' THEN
    SELECT id INTO v_existing_id 
    FROM auth.users 
    WHERE LOWER(TRIM(COALESCE(raw_user_meta_data->>'free_fire_uid', ''))) = v_clean_uid;
  END IF;
  
  IF v_existing_id IS NOT NULL THEN
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_pw,
      email = LOWER(p_email),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('ign', p_ign, 'free_fire_uid', p_uid, 'username', p_ign)
    WHERE id = v_existing_id;

    -- Ensure profile exists and has free_fire_uid & ign
    INSERT INTO public.profiles (id, player_id, username, ign, free_fire_uid)
    VALUES (
      v_existing_id,
      'ELITE-' || floor(10000 + random() * 90000)::TEXT,
      p_ign,
      p_ign,
      p_uid
    )
    ON CONFLICT (id) DO UPDATE SET
      free_fire_uid = CASE WHEN EXCLUDED.free_fire_uid <> '' THEN EXCLUDED.free_fire_uid ELSE public.profiles.free_fire_uid END,
      ign = CASE WHEN EXCLUDED.ign <> '' THEN EXCLUDED.ign ELSE public.profiles.ign END;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account updated successfully. You can now log in!',
      'user_id', v_existing_id
    );
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Clean up any detached profile row with matching free_fire_uid before inserting
  IF v_clean_uid <> '' THEN
    SELECT id INTO v_existing_prof_id FROM public.profiles WHERE LOWER(TRIM(free_fire_uid)) = v_clean_uid;
    IF v_existing_prof_id IS NOT NULL THEN
      DELETE FROM public.profiles WHERE id = v_existing_prof_id;
    END IF;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', LOWER(p_email), v_encrypted_pw, NOW(),
    '', '', '', '',
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('ign', p_ign, 'free_fire_uid', p_uid, 'username', p_ign),
    NOW(), NOW(), 'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(p_email)),
    'email', v_user_id::text, NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Ensure profile created with new user_id
  INSERT INTO public.profiles (id, player_id, username, ign, free_fire_uid)
  VALUES (
    v_user_id,
    'ELITE-' || floor(10000 + random() * 90000)::TEXT,
    p_ign,
    p_ign,
    p_uid
  )
  ON CONFLICT (id) DO UPDATE SET
    free_fire_uid = CASE WHEN EXCLUDED.free_fire_uid <> '' THEN EXCLUDED.free_fire_uid ELSE public.profiles.free_fire_uid END,
    ign = CASE WHEN EXCLUDED.ign <> '' THEN EXCLUDED.ign ELSE public.profiles.ign END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account created successfully.',
    'user_id', v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Storage Bucket Creation for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;
