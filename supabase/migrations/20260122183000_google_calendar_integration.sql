-- Google Calendar Integration Migration
-- Adds tables and fields needed for Google Calendar sync

-- 1. Create user_google_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    calendar_id TEXT DEFAULT 'primary',
    sync_enabled BOOLEAN DEFAULT true,
    reminder_days INTEGER[] DEFAULT ARRAY[1],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can view own tokens" ON public.user_google_tokens
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can insert own tokens" ON public.user_google_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can update own tokens" ON public.user_google_tokens
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can delete own tokens" ON public.user_google_tokens
    FOR DELETE USING (user_id = auth.uid());

-- 2. Add Google Calendar fields to tasks table
ALTER TABLE public.tasks 
    ADD COLUMN IF NOT EXISTS google_event_id TEXT,
    ADD COLUMN IF NOT EXISTS google_sync_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS google_sync_error TEXT,
    ADD COLUMN IF NOT EXISTS google_last_synced_at TIMESTAMPTZ;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON public.tasks(google_event_id);
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON public.user_google_tokens(user_id);

-- 4. Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_google_tokens TO authenticated;
