CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_invite_token uuid;
  v_manager_id uuid;
BEGIN
  -- Check if signing up via invite link
  v_invite_token := (NEW.raw_user_meta_data ->> 'invite_token')::uuid;
  
  IF v_invite_token IS NOT NULL THEN
    -- Find the manager who owns this invite token
    SELECT id INTO v_manager_id 
    FROM public.profiles 
    WHERE invite_token = v_invite_token AND role = 'manager';
    
    IF v_manager_id IS NOT NULL THEN
      -- Create as officer under the manager
      INSERT INTO public.profiles (id, email, full_name, cell_phone, company_name, role, parent_id)
      VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'cell_phone',
        NEW.raw_user_meta_data ->> 'company_name',
        'officer',
        v_manager_id
      );
      RETURN NEW;
    END IF;
  END IF;
  
  -- Default: create as manager
  INSERT INTO public.profiles (id, email, full_name, cell_phone, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'cell_phone',
    NEW.raw_user_meta_data ->> 'company_name'
  );
  RETURN NEW;
END;
$$;