-- Fix the trigger function to use net.http_post instead of extensions.http_post
CREATE OR REPLACE FUNCTION public.trigger_onboard_everflow_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if role is 'manager' and everflow_id is NULL
  IF NEW.role = 'manager' AND NEW.everflow_id IS NULL THEN
    -- Call the edge function using pg_net (net schema)
    PERFORM net.http_post(
      url := 'https://gmkqabszsvqsklkpmtmr.supabase.co/functions/v1/onboard-everflow-manager',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdta3FhYnN6c3Zxc2tsa3BtdG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTU3MzYsImV4cCI6MjA4MTY3MTczNn0.jj8TsCoCp9L-DQ1yzut6ohUd1snHtoIlE5HpsC4tsus'
      ),
      body := jsonb_build_object('profile_id', NEW.id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$;