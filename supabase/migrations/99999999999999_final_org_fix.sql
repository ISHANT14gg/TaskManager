-- 🚨 FINAL FIX: RLS Override & Organization Consolidation (FIXED SYNTAX)
-- Description: Allows Admins to transfer tasks across organizations & forces 'Sharma Accountant' branding.

DO $$
DECLARE
    sharma_org_id UUID;
BEGIN
    -- 1. Ensure "Sharma Accountant" organization exists
    SELECT id INTO sharma_org_id FROM public.organizations WHERE name = 'Sharma Accountant' LIMIT 1;
    IF sharma_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Sharma Accountant') RETURNING id INTO sharma_org_id;
    END IF;

    -- 2. Consolidate ALL existing data into this organization
    UPDATE public.profiles SET organization_id = sharma_org_id;
    UPDATE public.tasks SET organization_id = sharma_org_id;
    UPDATE public.notification_logs SET organization_id = sharma_org_id;

    -- 3. Simplified Signup Trigger (Fixed Dollar Quoting)
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $_$
    DECLARE
      user_count INTEGER;
      target_org_id UUID;
    BEGIN
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
    $_$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;

    -- 4. Create proper profile for any orphaned users
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    SELECT u.id, u.email, u.email, 'user', sharma_org_id
    FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;

END $$;

-- 🛡️ 5. HARDEN & RELAX RLS POLICIES FOR ADMINS
DROP POLICY IF EXISTS "allow_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "allow_insert_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "allow_update_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "allow_delete_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "Strict Org Isolation for Tasks" ON public.tasks;
DROP POLICY IF EXISTS "task_select_all_admin" ON public.tasks;
DROP POLICY IF EXISTS "task_insert_all_admin" ON public.tasks;
DROP POLICY IF EXISTS "task_update_all_admin" ON public.tasks;

-- SELECT: Users see their org's tasks, Admins see EVERYTHING
CREATE POLICY "task_select_all" ON public.tasks FOR SELECT 
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- INSERT: Users insert into their org, Admins can insert anywhere
CREATE POLICY "task_insert_all" ON public.tasks FOR INSERT 
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- UPDATE: Users update their org's tasks, Admins can update/transfer ANY task
CREATE POLICY "task_update_all" ON public.tasks FOR UPDATE 
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- DELETE: Users delete their org's tasks, Admins can delete ANY task
CREATE POLICY "task_delete_all" ON public.tasks FOR DELETE 
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
