-- Add explicit INSERT policy to deny direct profile inserts
-- Profiles should only be created via the auth trigger (handle_new_user)
CREATE POLICY "Profiles created via auth trigger only"
ON public.profiles
FOR INSERT
WITH CHECK (false);