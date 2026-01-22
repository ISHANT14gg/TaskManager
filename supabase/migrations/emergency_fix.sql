-- 🚨 EMERGENCY FIX: Multi-Tenancy & RLS Recovery
-- Run this in your Supabase SQL Editor if you are seeing 406 errors.

-- 1. Create Organizations table if missing
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reminder_time TEXT NOT NULL DEFAULT '09:00',
    is_automation_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_automation_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Ensure columns and categories table exist
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to view categories" ON public.categories;
CREATE POLICY "Allow all to view categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated to insert categories" ON public.categories;
CREATE POLICY "Allow authenticated to insert categories" ON public.categories 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated to update categories" ON public.categories;
CREATE POLICY "Allow authenticated to update categories" ON public.categories 
  FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow admins to delete categories" ON public.categories;
CREATE POLICY "Allow admins to delete categories" ON public.categories FOR DELETE USING (public.get_my_role() = 'admin');

-- 3. Temporarily Disable RLS to check if that's the source
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs DISABLE ROW LEVEL SECURITY;

-- 4. Ensure at least one Organization exists (Recovery)
INSERT INTO public.organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1);

-- 3. Assign Org ID to any orphaned users/tasks
DO $$
DECLARE
    fallback_org_id UUID;
BEGIN
    SELECT id INTO fallback_org_id FROM public.organizations LIMIT 1;
    
    UPDATE public.profiles SET organization_id = fallback_org_id WHERE organization_id IS NULL;
    UPDATE public.tasks SET organization_id = fallback_org_id WHERE organization_id IS NULL;
END $$;

-- 4. Re-implement Clean, Non-Recursive Policies
-- Helper: Get Role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper: Get Org
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL previous problematic policies
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins can view all in org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in org v2" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own tasks or admins can view all" ON public.tasks;
DROP POLICY IF EXISTS "Strict Org Isolation for Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Strict Org Isolation for Tasks v2" ON public.tasks;

-- 6. Apply ROBUST policies
-- PROFILES (Absolutely no subqueries here to prevent 406 recursion)
DROP POLICY IF EXISTS "allow_view_own" ON public.profiles;
CREATE POLICY "allow_view_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "allow_admin_view_all" ON public.profiles;
CREATE POLICY "allow_admin_view_all" ON public.profiles FOR SELECT USING (public.get_my_role() = 'admin');

-- TASKS
DROP POLICY IF EXISTS "allow_tasks_in_org" ON public.tasks;
CREATE POLICY "allow_tasks_in_org"
  ON public.tasks FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "allow_insert_tasks_in_org" ON public.tasks;
CREATE POLICY "allow_insert_tasks_in_org"
  ON public.tasks FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "allow_update_tasks_in_org" ON public.tasks;
CREATE POLICY "allow_update_tasks_in_org"
  ON public.tasks FOR UPDATE USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "allow_delete_tasks_in_org" ON public.tasks;
CREATE POLICY "allow_delete_tasks_in_org"
  ON public.tasks FOR DELETE USING (organization_id = public.get_my_org_id());

-- ORGANIZATIONS
DROP POLICY IF EXISTS "allow_view_own_org" ON public.organizations;
CREATE POLICY "allow_view_own_org"
  ON public.organizations FOR SELECT USING (id = public.get_my_org_id());

-- NOTIFICATION LOGS
DROP POLICY IF EXISTS "allow_logs_in_org" ON public.notification_logs;
CREATE POLICY "allow_logs_in_org"
  ON public.notification_logs FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "allow_insert_logs_in_org" ON public.notification_logs;
CREATE POLICY "allow_insert_logs_in_org"
  ON public.notification_logs FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());
