-- Add column to store Everflow encoded tracking value
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS everflow_encoded_value text;