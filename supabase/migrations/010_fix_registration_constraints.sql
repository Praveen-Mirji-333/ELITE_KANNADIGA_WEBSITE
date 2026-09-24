-- Migration 010: Fix tournament registration constraints & user_id uniqueness block
-- Drop restrictive (tournament_id, user_id) unique constraint so players can register multiple teams or register without auth errors
ALTER TABLE public.tournament_registrations DROP CONSTRAINT IF EXISTS tournament_registrations_tournament_id_user_id_key;

-- Make user_id nullable in tournament_registrations
ALTER TABLE public.tournament_registrations ALTER COLUMN user_id DROP NOT NULL;

-- Re-create register_tournament_team function with graceful user_id handling and exception safety
CREATE OR REPLACE FUNCTION public.register_tournament_team(
  p_tournament_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_captain_name TEXT DEFAULT NULL,
  p_captain_uid TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_team_name TEXT DEFAULT NULL,
  p_teammate_uids JSONB DEFAULT '[]'::jsonb,
  p_teammate_names JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_max_slots INT;
  v_current_slots INT;
  v_uid_conflict TEXT;
  v_valid_user_id UUID := NULL;
BEGIN
  IF p_captain_uid IS NULL OR TRIM(p_captain_uid) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free Fire UID is required for registration.');
  END IF;

  -- Validate if user_id exists in profiles, otherwise set to NULL
  IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    v_valid_user_id := p_user_id;
  END IF;

  -- 1. Check max slot limits
  SELECT max_slots INTO v_max_slots FROM public.tournaments WHERE id = p_tournament_id;
  IF v_max_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found.');
  END IF;

  SELECT COUNT(*) INTO v_current_slots FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id AND registration_status = 'confirmed';

  IF v_current_slots >= v_max_slots THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full! All slots have been filled.');
  END IF;

  -- 2. Duplicate Free Fire UID Check for Captain
  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND (captain_free_fire_uid = TRIM(p_captain_uid) OR teammate_uids @> jsonb_build_array(TRIM(p_captain_uid)))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free Fire UID (' || p_captain_uid || ') is already registered for this tournament!');
  END IF;

  -- 3. Duplicate Free Fire UID Check for Teammates
  FOR v_uid_conflict IN SELECT jsonb_array_elements_text(p_teammate_uids)
  LOOP
    IF TRIM(v_uid_conflict) <> '' AND EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = p_tournament_id
        AND (captain_free_fire_uid = TRIM(v_uid_conflict) OR teammate_uids @> jsonb_build_array(TRIM(v_uid_conflict)))
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Teammate Free Fire UID (' || v_uid_conflict || ') is already registered for this tournament!');
    END IF;
  END LOOP;

  -- 4. Perform Registration Insertion
  INSERT INTO public.tournament_registrations (
    tournament_id,
    user_id,
    team_name,
    captain_name,
    captain_free_fire_uid,
    phone_number,
    teammate_uids,
    teammate_names,
    registration_status
  ) VALUES (
    p_tournament_id,
    v_valid_user_id,
    COALESCE(p_team_name, p_captain_name),
    p_captain_name,
    TRIM(p_captain_uid),
    p_phone,
    p_teammate_uids,
    p_teammate_names,
    'confirmed'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Successfully registered for the tournament!');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
