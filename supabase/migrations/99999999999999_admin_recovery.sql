-- 🛠️ Admin & Organization Recovery Script
-- RUN THIS IN SUPABASE SQL EDITOR

DO $$
DECLARE
    sharma_org_id UUID;
BEGIN
    -- 1. Ensure "Sharma Accountant" organization exists
    SELECT id INTO sharma_org_id FROM public.organizations WHERE name = 'Sharma Accountant' LIMIT 1;
    IF sharma_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Sharma Accountant') RETURNING id INTO sharma_org_id;
    END IF;

    -- 2. Consolidate ALL users, tasks, and logs into this organization
    UPDATE public.profiles SET organization_id = sharma_org_id;
    UPDATE public.tasks SET organization_id = sharma_org_id;
    UPDATE public.notification_logs SET organization_id = sharma_org_id;

    -- 3. Simplify the signup trigger to always use this organization
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$$
    DECLARE
      user_count INTEGER;
      target_org_id UUID;
    BEGIN
      -- Always join "Sharma Accountant"
      SELECT id INTO target_org_id FROM public.organizations WHERE name = 'Sharma Accountant' LIMIT 1;
      
      SELECT COUNT(*) INTO user_count FROM public.profiles;
      
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
    $$$;

    -- 4. FIX: Ensure any user without a profile gets one (if signup failed earlier)
    -- This part is tricky as we don't have the password/metadata here, 
    -- but we can at least create basic profiles for anyone in auth.users missing one.
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    SELECT u.id, u.email, u.email, 'user', sharma_org_id
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Consolidation complete. Sharma Accountant Org ID: %', sharma_org_id;
END $$;

-- 💡 HELPER: Promote a specific user to admin if they lost access
-- Replace 'your-email@example.com' with your actual email
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
