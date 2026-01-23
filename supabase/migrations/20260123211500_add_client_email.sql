-- Add client_email column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.tasks.client_email IS 'Email address of the client associated with this task, for sending reminders.';
