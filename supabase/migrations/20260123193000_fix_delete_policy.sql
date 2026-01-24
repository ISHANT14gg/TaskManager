-- FIX: Allow users to delete their own tasks directly
-- This migration overrides previous restrictive policies that required organization_id matching.

-- 1. Helper function to check role safely (if not already exists)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Drop conflicting DELETE policies on tasks
DROP POLICY IF EXISTS "allow_delete_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "task_delete_all" ON public.tasks;
DROP POLICY IF EXISTS "Strict Org Isolation for Tasks" ON public.tasks;
DROP POLICY IF EXISTS "delete_own_tasks" ON public.tasks;

-- 3. Create simplified DELETE policy
-- Users can delete a task if:
-- A) They are the creator (user_id matches)
-- B) They are an admin
DROP POLICY IF EXISTS "enhanced_delete_policy" ON public.tasks;
CREATE POLICY "enhanced_delete_policy" ON public.tasks FOR DELETE
USING (
  user_id = auth.uid() 
  OR 
  public.check_is_admin()
);

-- 4. Also ensure UPDATE is permissive for owners
DROP POLICY IF EXISTS "allow_update_tasks_in_org" ON public.tasks;
DROP POLICY IF EXISTS "task_update_all" ON public.tasks;

DROP POLICY IF EXISTS "enhanced_update_policy" ON public.tasks;
CREATE POLICY "enhanced_update_policy" ON public.tasks FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  public.check_is_admin()
);
