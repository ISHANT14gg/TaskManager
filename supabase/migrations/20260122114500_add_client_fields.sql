-- 📝 ADD CLIENT FIELDS TO TASKS TABLE
-- Description: Adds client_name and client_phone to store client-specific details for each task.

-- 1. Add columns to public.tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- 2. Update existing tasks (Optional: No action needed if null is acceptable)

-- 3. Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'client_name') THEN
        RAISE EXCEPTION 'Column client_name was not created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'client_phone') THEN
        RAISE EXCEPTION 'Column client_phone was not created';
    END IF;
END $$;
