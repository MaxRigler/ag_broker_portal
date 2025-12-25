-- Add Everflow-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN everflow_user_id INTEGER DEFAULT NULL,
ADD COLUMN everflow_account_status TEXT DEFAULT 'pending',
ADD COLUMN everflow_network_id INTEGER,
ADD COLUMN everflow_tracking_domain TEXT,
ADD COLUMN everflow_api_key TEXT DEFAULT NULL;