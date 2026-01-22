-- 🏗️ Migration: Brand-Based Organization Assignment
-- Description: Updates handle_new_user to assign organizations based on brand metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  target_org_id UUID;
  org_name_from_meta TEXT;
BEGIN
  -- 1. Extract org name from metadata (passed during signUp)
  org_name_from_meta := NEW.raw_user_meta_data->>'org_name';
  
  -- 2. Check current user count to determine if first user is admin
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- 3. Determine Target Organization
  IF org_name_from_meta IS NOT NULL THEN
    -- Try to find existing organization by name
    SELECT id INTO target_org_id FROM public.organizations WHERE name = org_name_from_meta LIMIT 1;
    
    -- Create the organization if it doesn't exist yet
    IF target_org_id IS NULL THEN
      INSERT INTO public.organizations (name) VALUES (org_name_from_meta) RETURNING id INTO target_org_id;
    END IF;
  ELSE
    -- FALLBACK: If no org_name provided, use existing logic
    IF user_count = 0 THEN
      -- First user create first org
      INSERT INTO public.organizations (name) VALUES ('Default Organization') RETURNING id INTO target_org_id;
    ELSE
      -- Subsequent users join the first available org or "Default Organization"
      SELECT id INTO target_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
      IF target_org_id IS NULL THEN
        SELECT id INTO target_org_id FROM public.organizations LIMIT 1;
      END IF;
    END IF;
  END IF;
  
  -- 4. Create the User Profile
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'user' END,
    target_org_id
  );
  
  RETURN NEW;
END;
$$;
