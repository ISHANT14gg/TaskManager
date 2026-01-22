-- 🏗️ Migration: Multi-Tenancy & Strong Authorization
-- Description: Adds Organizations and hardens RLS policies to enforce cross-tenant isolation.

-- 1. Create Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add organization_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 3. Data Migration: Create a default organization for existing data
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Check if we have data and need a default org
    IF EXISTS (SELECT 1 FROM public.profiles WHERE organization_id IS NULL) THEN
        INSERT INTO public.organizations (name) VALUES ('Default Organization') RETURNING id INTO default_org_id;
        
        UPDATE public.profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.tasks SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.notification_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 4. Apply NOT NULL constraints after data migration
ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notification_logs ALTER COLUMN organization_id SET NOT NULL;

-- 5. Harden RLS Policies (Drop and Recreate with Org Checks)

-- --- PROFILES ---
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins can view all in org"
  ON public.profiles FOR SELECT
  USING (
    (auth.uid() = id) OR 
    (public.is_admin() AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own profile (except role) or admins can update all" ON public.profiles;
CREATE POLICY "Users can update profiles in org"
  ON public.profiles FOR UPDATE
  USING (
    (auth.uid() = id) OR 
    (public.is_admin() AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) OR
    (public.is_admin() AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  );

-- --- TASKS ---
DROP POLICY IF EXISTS "Users can view own tasks or admins can view all" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks; -- From transfer migration
CREATE POLICY "Strict Org Isolation for Tasks"
  ON public.tasks FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (user_id = auth.uid() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users can insert own tasks or admins can insert for anyone" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Task Insertion"
  ON public.tasks FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (user_id = auth.uid() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users can update own tasks or admins can update all" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks; -- From transfer migration
CREATE POLICY "Strict Org Isolation for Task Updates"
  ON public.tasks FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (user_id = auth.uid() OR public.is_admin())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (user_id = auth.uid() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users can delete own tasks or admins can delete all" ON public.tasks;
CREATE POLICY "Strict Org Isolation for Task Deletion"
  ON public.tasks FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (user_id = auth.uid() OR public.is_admin())
  );

-- 6. Update handle_new_user trigger to handle organizations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  default_org_id UUID;
BEGIN
  -- Check if this is the first user (make them admin and create first org if needed)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Use existing org or create first one
  IF user_count = 0 THEN
    INSERT INTO public.organizations (name) VALUES ('My Organization') RETURNING id INTO default_org_id;
  ELSE
    -- For now, new users join the "Default Organization" 
    -- In a real app, they would have an invitation or join a specific org
    SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
    
    -- Fallback if Default doesn't exist
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'user' END,
    default_org_id
  );
  RETURN NEW;
END;
$$;

-- 7. Organizations RLS
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- 8. Add indexes for Organization lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_org_id ON public.notification_logs(organization_id);
