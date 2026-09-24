-- 004_admin_role_helper.sql
-- Function to easily promote any user to Admin by email

CREATE OR REPLACE FUNCTION public.make_user_admin(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = TRIM(p_email);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email not found in auth.users');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Promoted ' || p_email || ' to Admin!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
