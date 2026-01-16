# Deployment Checklist

Use this checklist to ensure everything is set up correctly before deploying.

## ✅ Pre-Deployment Checks

### 1. Database Setup
- [ ] Run all migrations:
  ```bash
  supabase migration up
  ```
- [ ] Verify tables exist: `profiles`, `tasks`, `notification_logs`
- [ ] Verify RLS policies are enabled
- [ ] Test database functions: `get_tasks_for_reminders()`

### 2. Environment Variables
- [ ] Set `VITE_SUPABASE_URL` in your `.env` file
- [ ] Set `VITE_SUPABASE_PUBLISHABLE_KEY` in your `.env` file
- [ ] Verify environment variables are loaded correctly

### 3. Edge Function Setup
- [ ] Deploy the edge function:
  ```bash
  supabase functions deploy send-task-reminders
  ```
- [ ] Set email service API key:
  ```bash
  supabase secrets set RESEND_API_KEY=your_key_here
  ```
- [ ] Update the `from` email address in the edge function
- [ ] Test the edge function manually:
  ```bash
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-task-reminders \
    -H "Authorization: Bearer YOUR_ANON_KEY"
  ```

### 4. Email Service Configuration
- [ ] Sign up for email service (Resend, SendGrid, etc.)
- [ ] Verify your domain (if using Resend)
- [ ] Test sending a single email
- [ ] Check email service quotas/limits

### 5. Cron Job Setup
- [ ] Set up Supabase Cron Job or external scheduler
- [ ] Configure daily schedule (recommended: 9 AM UTC)
- [ ] Test cron job execution
- [ ] Monitor first few executions

### 6. Application Build
- [ ] Run build command:
  ```bash
  npm run build
  ```
- [ ] Check for build errors
- [ ] Test the built application locally:
  ```bash
  npm run preview
  ```

### 7. Authentication Testing
- [ ] Test user signup (first user should be admin)
- [ ] Test user login
- [ ] Test logout
- [ ] Verify admin dashboard access
- [ ] Test protected routes

### 8. Task Management Testing
- [ ] Create a new task
- [ ] Edit an existing task
- [ ] Complete a task
- [ ] Delete a task
- [ ] Verify tasks appear in correct priority groups
- [ ] Test recurring tasks

### 9. Email Notification Testing
- [ ] Create a test task with deadline within 5 days
- [ ] Verify user has `notify_email = true`
- [ ] Manually trigger email from admin dashboard
- [ ] Check `notification_logs` table for entries
- [ ] Verify email was received
- [ ] Test duplicate prevention (shouldn't send twice in one day)

### 10. UI/UX Verification
- [ ] Verify dashboard shows tasks by priority
- [ ] Check urgent tasks appear first (red)
- [ ] Check warning tasks appear second (orange)
- [ ] Check upcoming tasks appear third (yellow)
- [ ] Check normal tasks appear fourth (blue)
- [ ] Check completed tasks appear last (green)
- [ ] Test responsive design on mobile
- [ ] Verify all buttons and links work

## 🚀 Deployment Steps

### Option 1: Vercel
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy

### Option 2: Netlify
1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

### Option 3: Other Platforms
- Follow platform-specific deployment guides
- Ensure environment variables are set
- Configure build and start commands

## 📊 Post-Deployment Monitoring

### Week 1
- [ ] Monitor error logs daily
- [ ] Check email delivery rates
- [ ] Verify cron jobs are running
- [ ] Monitor database performance
- [ ] Check user feedback

### Ongoing
- [ ] Review notification logs weekly
- [ ] Monitor email service usage/quota
- [ ] Check for failed email deliveries
- [ ] Review and optimize database queries
- [ ] Update dependencies regularly

## 🔧 Troubleshooting

### Common Issues

**Emails not sending:**
- Check edge function logs in Supabase Dashboard
- Verify API key is set correctly
- Check email service account status
- Verify domain verification (Resend)

**Tasks not appearing:**
- Check user authentication
- Verify RLS policies
- Check browser console for errors
- Verify database connection

**Cron job not running:**
- Check Supabase Dashboard > Database > Cron Jobs
- Verify cron job is enabled
- Check cron job logs
- Test function manually first

**Build errors:**
- Clear node_modules and reinstall
- Check for TypeScript errors
- Verify all dependencies are installed
- Check environment variables

## 📝 Notes

- First user automatically becomes admin
- Email reminders sent daily at configured time
- Duplicate emails prevented (one per day per task)
- All notifications logged in `notification_logs` table
- Tasks stored in Supabase database (not localStorage)

## 🆘 Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Review browser console errors
3. Check email service dashboard
4. Review database logs
5. Check edge function logs
