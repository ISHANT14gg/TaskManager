# Email Automation Setup Guide

This guide will help you set up automated email reminders for tasks due within 5 days.

## Prerequisites

1. A Supabase project with the database migrations applied
2. An email service API key (Resend, SendGrid, Mailgun, etc.)

## Step 1: Deploy the Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-task-reminders
   ```

## Step 2: Configure Email Service

### Option A: Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Set the secret in Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

4. Update the `from` email in `supabase/functions/send-task-reminders/index.ts`:
   ```typescript
   from: "Compliance Tracker <noreply@yourdomain.com>",
   ```
   (Make sure the domain is verified in Resend)

### Option B: Using SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Modify the `sendEmail` function in the edge function to use SendGrid API
4. Set the secret:
   ```bash
   supabase secrets set SENDGRID_API_KEY=your_api_key_here
   ```

### Option C: Using SMTP (Nodemailer)

1. Install nodemailer in the edge function
2. Configure SMTP settings
3. Update the `sendEmail` function accordingly

## Step 3: Set Up Automated Scheduling

### Option 1: Supabase Cron Jobs (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to Database > Cron Jobs
3. Create a new cron job:
   - **Name**: `send-task-reminders`
   - **Schedule**: `0 9 * * *` (runs daily at 9 AM UTC)
   - **SQL Command**:
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-task-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_ANON_KEY'
       ),
       body := '{}'::jsonb
     );
     ```

### Option 2: External Cron Service

Use services like:
- **Cron-job.org**: Free cron service
- **EasyCron**: Reliable cron service
- **GitHub Actions**: If your code is on GitHub

Set up a webhook that calls:
```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-task-reminders
Headers:
  Authorization: Bearer YOUR_ANON_KEY
  Content-Type: application/json
```

### Option 3: Manual Trigger (Testing)

You can manually trigger emails from the Admin Dashboard:
1. Log in as an admin
2. Go to the Admin Dashboard
3. Click "Send Reminders" button in the Email Notifications section

## Step 4: Test the Setup

1. Create a test task with a deadline within 5 days
2. Make sure the user has `notify_email = true` in their profile
3. Manually trigger the function or wait for the scheduled time
4. Check the `notification_logs` table to see if emails were sent

## Step 5: Monitor Email Logs

Check the `notification_logs` table to monitor:
- Which emails were sent successfully
- Which emails failed
- Error messages for failed attempts

Query example:
```sql
SELECT 
  nl.*,
  p.email,
  t.name as task_name
FROM notification_logs nl
JOIN profiles p ON nl.user_id = p.id
JOIN tasks t ON nl.task_id = t.id
ORDER BY nl.sent_at DESC
LIMIT 50;
```

## Troubleshooting

### Emails not sending

1. Check the edge function logs in Supabase Dashboard
2. Verify the API key is set correctly: `supabase secrets list`
3. Check if the email service account is active
4. Verify domain verification (for Resend)

### Duplicate emails

The system prevents duplicate emails by checking if a notification was already sent today for each task. If you're still getting duplicates:
- Check the `notification_logs` table
- Verify the date comparison logic in the edge function

### Function not triggering

1. Verify the cron job is enabled in Supabase Dashboard
2. Check the cron job logs
3. Test the function manually first
4. Verify the function URL is correct

## Email Template Customization

You can customize the email template in `supabase/functions/send-task-reminders/index.ts`. The HTML template is in the `emailHtml` variable.

## Security Notes

- Never commit API keys to version control
- Use Supabase secrets for all sensitive data
- The edge function uses service role key for database access
- RLS policies ensure users only see their own data

## Next Steps

- Set up WhatsApp notifications (if needed)
- Customize email templates
- Add more notification channels
- Set up email preferences per user
