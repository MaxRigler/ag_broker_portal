-- Enable the pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call the edge function when conditions are met
CREATE OR REPLACE FUNCTION public.trigger_onboard_everflow_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Only trigger if role is 'manager' and everflow_id is NULL
  IF NEW.role = 'manager' AND NEW.everflow_id IS NULL THEN
    -- Get Supabase URL from environment
    supabase_url := 'https://gmkqabszsvqsklkpmtmr.supabase.co';
    anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Call the edge function asynchronously
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/onboard-everflow-manager',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdta3FhYnN6c3Zxc2tsa3BtdG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTU3MzYsImV4cCI6MjA4MTY3MTczNn0.jj8TsCoCp9L-DQ1yzut6ohUd1snHtoIlE5HpsC4tsus'
      ),
      body := jsonb_build_object('profile_id', NEW.id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table for INSERT and UPDATE
DROP TRIGGER IF EXISTS on_profile_onboard_everflow ON public.profiles;
CREATE TRIGGER on_profile_onboard_everflow
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_onboard_everflow_manager();