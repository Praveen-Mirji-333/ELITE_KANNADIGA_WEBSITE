-- ============================================================================
-- ELITE KANNADIGA — EMAIL + PASSWORD + UNIQUE UID AUTHENTICATION BINDING
-- Project URL: https://lmawrsmjyermswzwttbe.supabase.co
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/lmawrsmjyermswzwttbe/sql/new
--
-- What this script enforces at the database layer:
--   1. Stores `email` on `public.profiles` synced from `auth.users`.
--   2. Makes BOTH `email` (case-insensitive) and `free_fire_uid` strictly
--      UNIQUE keys on `public.profiles`.
--   3. Permanently binds Email <-> Free Fire UID after registration so
--      neither can be reassigned or reused on a different account.
--   4. Provides `check_registration_binding(p_email, p_uid)` and
--      `register_with_email_and_uid(p_email, p_password, p_uid, p_ign)` RPCs.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Add email column to profiles and backfill from auth.users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = lower(trim(u.email))
FROM auth.users u
WHERE p.id = u.id
  AND u.email IS NOT NULL
  AND (p.email IS NULL OR trim(p.email) = '');

-- 2. Enforce UNIQUE constraints on BOTH email and free_fire_uid
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_free_fire_uid_unique
  ON public.profiles (trim(free_fire_uid))
  WHERE free_fire_uid IS NOT NULL AND trim(free_fire_uid) <> '';

-- 3. Update handle_new_user trigger so signups populate both email and free_fire_uid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_num INT;
  v_player_id TEXT;
  v_email TEXT;
  v_uid TEXT;
  v_username TEXT;
  v_ign TEXT;
BEGIN
  v_email := NULLIF(lower(trim(NEW.email)), '');
  v_uid := NULLIF(trim(NEW.raw_user_meta_data->>'free_fire_uid'), '');
  v_player_num := floor(10000 + random() * 90000)::INT;
  v_player_id := 'ELITE-' || v_player_num::TEXT;

  v_username := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(SPLIT_PART(COALESCE(v_email, ''), '@', 1), ''),
    COALESCE(v_uid, 'PLAYER')
  );
  v_ign := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'ign'), ''),
    v_username
  );

  INSERT INTO public.profiles (
    id, player_id, username, ign, email, free_fire_uid, avatar_url
  ) VALUES (
    NEW.id,
    v_player_id,
    v_username,
    v_ign,
    v_email,
    v_uid,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
      'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    free_fire_uid = COALESCE(NULLIF(trim(public.profiles.free_fire_uid), ''), EXCLUDED.free_fire_uid);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Lock Email <-> Free Fire UID binding once established on a profile
CREATE OR REPLACE FUNCTION public.enforce_immutable_email_uid_binding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') OR public.is_admin(auth.uid()) THEN
    IF NEW.email IS NOT NULL THEN
      NEW.email := lower(trim(NEW.email));
    END IF;
    IF NEW.free_fire_uid IS NOT NULL THEN
      NEW.free_fire_uid := NULLIF(trim(NEW.free_fire_uid), '');
    END IF;
    RETURN NEW;
  END IF;

  -- Once email is bound, non-admin cannot change it
  IF OLD.email IS NOT NULL AND trim(OLD.email) <> '' THEN
    IF lower(trim(COALESCE(NEW.email, ''))) <> lower(trim(OLD.email)) THEN
      RAISE EXCEPTION 'EMAIL_UID_BINDING_LOCKED: Bound email cannot be changed after registration.';
    END IF;
  END IF;

  -- Once Free Fire UID is bound, non-admin cannot change it
  IF OLD.free_fire_uid IS NOT NULL AND trim(OLD.free_fire_uid) <> '' THEN
    IF trim(COALESCE(NEW.free_fire_uid, '')) <> trim(OLD.free_fire_uid) THEN
      RAISE EXCEPTION 'EMAIL_UID_BINDING_LOCKED: Bound Free Fire UID cannot be changed after registration.';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  IF NEW.free_fire_uid IS NOT NULL THEN
    NEW.free_fire_uid := NULLIF(trim(NEW.free_fire_uid), '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_immutable_email_uid_binding ON public.profiles;
CREATE TRIGGER trg_enforce_immutable_email_uid_binding
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_immutable_email_uid_binding();

-- 5. Pre-registration validation RPC for Email & UID uniqueness + binding
CREATE OR REPLACE FUNCTION public.check_registration_binding(
  p_email TEXT,
  p_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid TEXT := trim(COALESCE(p_uid, ''));
  v_email_owner UUID;
  v_email_bound_uid TEXT;
  v_uid_owner UUID;
  v_uid_bound_email TEXT;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('available', false, 'code', 'EMAIL_REQUIRED', 'message', 'Email address is required.');
  END IF;
  IF v_uid = '' OR v_uid !~ '^\d+$' THEN
    RETURN jsonb_build_object('available', false, 'code', 'INVALID_UID', 'message', 'Free Fire UID must contain numbers only.');
  END IF;

  -- Check if email already exists in auth.users or profiles
  SELECT u.id, p.free_fire_uid
  INTO v_email_owner, v_email_bound_uid
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(trim(u.email)) = v_email
  LIMIT 1;

  IF v_email_owner IS NULL THEN
    SELECT p.id, p.free_fire_uid
    INTO v_email_owner, v_email_bound_uid
    FROM public.profiles p
    WHERE lower(trim(p.email)) = v_email
    LIMIT 1;
  END IF;

  -- Check if UID already exists in profiles
  SELECT p.id, COALESCE(NULLIF(trim(p.email), ''), lower(trim(u.email)))
  INTO v_uid_owner, v_uid_bound_email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE trim(p.free_fire_uid) = v_uid
  LIMIT 1;

  IF v_email_owner IS NOT NULL AND v_uid_owner IS NOT NULL AND v_email_owner = v_uid_owner THEN
    RETURN jsonb_build_object(
      'available', false,
      'code', 'ACCOUNT_ALREADY_EXISTS',
      'message', 'This email and Free Fire UID are already registered together. Please log in with your email and password.'
    );
  END IF;

  IF v_email_owner IS NOT NULL THEN
    IF v_email_bound_uid IS NOT NULL AND trim(v_email_bound_uid) <> '' AND trim(v_email_bound_uid) <> v_uid THEN
      RETURN jsonb_build_object(
        'available', false,
        'code', 'EMAIL_BOUND_TO_OTHER_UID',
        'message', 'This email is already bound to a different Free Fire UID. Please log in with your registered email and password.'
      );
    END IF;
    RETURN jsonb_build_object(
      'available', false,
      'code', 'EMAIL_ALREADY_EXISTS',
      'message', 'This email is already registered. Please log in with your email and password.'
    );
  END IF;

  IF v_uid_owner IS NOT NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'code', 'UID_ALREADY_BOUND',
      'message', 'This Free Fire UID is already registered and bound to another email. Please log in with that registered email and password.'
    );
  END IF;

  RETURN jsonb_build_object('available', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_binding(TEXT, TEXT) TO anon, authenticated;

-- 6. Atomic Email + Password + Unique UID registration RPC (auto-confirms auth user)
CREATE OR REPLACE FUNCTION public.register_with_email_and_uid(
  p_email TEXT,
  p_password TEXT,
  p_uid TEXT,
  p_ign TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid TEXT := trim(COALESCE(p_uid, ''));
  v_ign TEXT;
  v_check JSONB;
  v_user_id UUID := gen_random_uuid();
  v_instance_id UUID;
BEGIN
  IF length(COALESCE(p_password, '')) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;

  v_check := public.check_registration_binding(v_email, v_uid);
  IF NOT COALESCE((v_check->>'available')::BOOLEAN, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', v_check->>'code',
      'error', v_check->>'message'
    );
  END IF;

  v_ign := COALESCE(
    NULLIF(trim(COALESCE(p_ign, '')), ''),
    NULLIF(SPLIT_PART(v_email, '@', 1), ''),
    'Player_' || v_uid
  );

  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  v_instance_id := COALESCE(v_instance_id, '00000000-0000-0000-0000-000000000000'::uuid);

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_instance_id,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('email', v_email, 'free_fire_uid', v_uid, 'ign', v_ign, 'username', v_ign),
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT DO NOTHING;

  -- Ensure profiles row holds the bound email + unique UID
  UPDATE public.profiles
  SET email = v_email,
      free_fire_uid = v_uid
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'free_fire_uid', v_uid
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email or Free Fire UID is already registered. Both Email and UID must be unique.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_with_email_and_uid(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

