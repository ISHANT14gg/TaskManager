-- Migration: Add Task Transfer Support
-- Enable administrators to transfer tasks between users

-- Add transfer tracking columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Create index for faster lookups on transferred tasks
CREATE INDEX IF NOT EXISTS idx_tasks_transferred_from ON public.tasks(transferred_from);

-- Drop existing admin policies if they exist (to recreate)
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;

-- Allow admins to view all tasks in the system
CREATE POLICY "Admins can view all tasks" ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update any task (for transfers)
CREATE POLICY "Admins can update any task" ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comment on columns for documentation
COMMENT ON COLUMN public.tasks.transferred_from IS 'User ID of the admin who transferred this task (if applicable)';
COMMENT ON COLUMN public.tasks.transferred_at IS 'Timestamp when the task was transferred';
