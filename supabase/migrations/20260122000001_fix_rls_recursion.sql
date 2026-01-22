-- 🛠️ Migration: Fix RLS Recursion & 406 Errors
-- Description: Improves RLS efficiency and prevents recursion by using SECURITY DEFINER helper functions.

-- 1. Create helper function for Organization ID (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 2. Update Profiles Policies (Remove subqueries to profiles table)
DROP POLICY IF EXISTS "Users can view own profile or admins can view all in org" ON public.profiles;
CREATE POLICY "Users can view profiles in org"
  ON public.profiles FOR SELECT
  USING (
    (auth.uid() = id) OR 
    (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  );

DROP POLICY IF EXISTS "Users can update profiles in org" ON public.profiles;
CREATE POLICY "Users can update profiles in org v2"
  ON public.profiles FOR UPDATE
  USING (
    (auth.uid() = id) OR 
    (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  )
  WITH CHECK (
    ((auth.uid() = id) AND (role = public.get_my_role()) AND (organization_id = public.get_my_org_id())) OR
    (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  );

-- 3. Update Tasks Policies
DROP POLICY IF EXISTS "Strict Org Isolation for Tasks" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Tasks v2"
  ON public.tasks FOR SELECT
  USING (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

DROP POLICY IF EXISTS "Strict Org Isolation for Task Insertion" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Task Insertion v2"
  ON public.tasks FOR INSERT
  WITH CHECK (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

DROP POLICY IF EXISTS "Strict Org Isolation for Task Updates" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Task Updates v2"
  ON public.tasks FOR UPDATE
  USING (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  )
  WITH CHECK (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

DROP POLICY IF EXISTS "Strict Org Isolation for Task Deletion" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Task Deletion v2"
  ON public.tasks FOR DELETE
  USING (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

-- 4. Notification Logs Policies
DROP POLICY IF EXISTS "Users can view own logs or admins can view all" ON public.notification_logs;
CREATE POLICY "Org Isolation for Notification Logs"
  ON public.notification_logs FOR SELECT
  USING (
    organization_id = public.get_my_org_id() AND
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

-- 5. Ensure existing users have an organization_id assigned (Recovery)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
    
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    END IF;

    IF default_org_id IS NOT NULL THEN
        UPDATE public.profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.tasks SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.notification_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;
