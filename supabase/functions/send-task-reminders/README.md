# Send Task Reminders Edge Function

This Supabase Edge Function sends email reminders to users for tasks that are due within 5 days.

## Setup

1. **Get Resend API Key** (or use another email service):
   - Sign up at https://resend.com
   - Create an API key
   - Add it to your Supabase project secrets:
     ```bash
     supabase secrets set RESEND_API_KEY=your_api_key_here
     ```

2. **Deploy the function**:
   ```bash
   supabase functions deploy send-task-reminders
   ```

3. **Set up scheduled execution**:
   - Option 1: Use Supabase Cron (recommended)
     - Go to Supabase Dashboard > Database > Cron Jobs
     - Create a new cron job that calls this function daily
   
   - Option 2: Use pg_cron extension
     ```sql
     SELECT cron.schedule(
       'send-task-reminders',
       '0 9 * * *', -- Run daily at 9 AM
       $$
       SELECT net.http_post(
         url := 'https://your-project.supabase.co/functions/v1/send-task-reminders',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR_ANON_KEY'
         ),
         body := '{}'::jsonb
       );
       $$
     );
     ```

4. **Manual trigger** (for testing):
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-task-reminders \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

## Features

- Sends emails only to users with `notify_email = true`
- Groups tasks by urgency (urgent, warning, upcoming)
- Prevents duplicate emails (checks if notification was sent today)
- Logs all notification attempts in `notification_logs` table
- Beautiful HTML email templates

## Email Service Alternatives

If you don't want to use Resend, you can modify the `sendEmail` function to use:
- SendGrid
- Mailgun
- AWS SES
- Nodemailer with SMTP
- Or any other email service API
