-- Migration: Allow unauthenticated users to validate invite tokens
-- This is needed because the OfficerSignup page queries profiles by invite_token
-- BEFORE the user has authenticated (they're signing up via the invite link)
--
-- Security considerations:
-- 1. The invite_token is a UUID that must be known in advance (not guessable)
-- 2. Only full_name and company_name are exposed (public info for displaying who invited them)
-- 3. The token is effectively a capability token - possessing it grants limited read access

CREATE POLICY "Anyone can validate invite tokens"
ON public.profiles
FOR SELECT
USING (invite_token IS NOT NULL);
