-- 008_rate_limit_fix.sql
-- Create an RPC to safely pre-register/provision accounts without triggering SMTP rate limits

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
BEGIN
  -- Check if user already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = LOWER(p_email);
  
  IF v_existing_id IS NOT NULL THEN
    -- Update password and confirmation status for existing account
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('ign', p_ign, 'free_fire_uid', p_uid, 'username', p_ign)
    WHERE id = v_existing_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account updated successfully. You can now log in!',
      'user_id', v_existing_id
    );
  END IF;

  -- Generate new UUID and encrypted password
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Insert directly into auth.users bypassing SMTP rate limit
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
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    LOWER(p_email),
    v_encrypted_pw,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('ign', p_ign, 'free_fire_uid', p_uid, 'username', p_ign),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account created successfully! You can now log in.',
    'user_id', v_user_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.create_player_account(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
