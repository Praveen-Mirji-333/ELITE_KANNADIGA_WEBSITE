-- Migration 012: Fix Delete Policy for Tournament Registrations

-- Enable DELETE for public/authenticated users on tournament_registrations
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Anyone can delete registrations" ON public.tournament_registrations;

CREATE POLICY "Anyone can delete registrations"
ON public.tournament_registrations
FOR DELETE
TO public
USING (true);
