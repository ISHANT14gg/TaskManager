-- Function to check and send email reminders for tasks due soon
-- This will be called by pg_cron or Supabase Edge Function

-- Update notification_logs policy to allow system inserts
DROP POLICY IF EXISTS "Only system can insert logs" ON public.notification_logs;
CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Function to get tasks that need reminders
CREATE OR REPLACE FUNCTION public.get_tasks_for_reminders()
RETURNS TABLE (
  task_id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  task_name TEXT,
  task_category TEXT,
  deadline TIMESTAMPTZ,
  days_until_deadline INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date DATE;
  five_days_later DATE;
BEGIN
  today_date := CURRENT_DATE;
  five_days_later := today_date + INTERVAL '5 days';
  
  RETURN QUERY
  SELECT 
    t.id AS task_id,
    t.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    t.name AS task_name,
    t.category AS task_category,
    t.deadline,
    EXTRACT(DAY FROM (t.deadline::DATE - today_date))::INTEGER AS days_until_deadline
  FROM public.tasks t
  INNER JOIN public.profiles p ON t.user_id = p.id
  WHERE 
    t.completed = false
    AND p.notify_email = true
    AND t.deadline::DATE >= today_date
    AND t.deadline::DATE <= five_days_later
    AND NOT EXISTS (
      -- Check if notification was already sent today
      SELECT 1 
      FROM public.notification_logs nl
      WHERE 
        nl.task_id = t.id
        AND nl.user_id = t.user_id
        AND nl.channel = 'email'
        AND nl.status = 'sent'
        AND nl.sent_at::DATE = today_date
    )
  ORDER BY t.deadline ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_tasks_for_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasks_for_reminders() TO anon;

-- Create index for better performance on notification checks
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at 
  ON public.notification_logs(sent_at, task_id, user_id, channel, status);

-- Add comment
COMMENT ON FUNCTION public.get_tasks_for_reminders() IS 
  'Returns tasks that need email reminders (due within 5 days, not completed, user has email notifications enabled, and no notification sent today)';
