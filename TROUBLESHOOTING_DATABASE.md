# Database Troubleshooting Guide

If tasks are not being saved to the database, follow these steps:

## Common Issues and Solutions

### 1. Check Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**To verify:**
- Open browser console (F12)
- Check for errors related to Supabase connection
- Verify the URL and key are loaded correctly

### 2. Check Database Migrations

Ensure all migrations have been run:

```bash
supabase migration up
```

**Verify tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'tasks', 'notification_logs');
```

### 3. Check Row Level Security (RLS) Policies

RLS policies might be blocking inserts. Verify policies are correct:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- Check policies for tasks table
SELECT * FROM pg_policies WHERE tablename = 'tasks';
```

**If RLS is blocking, temporarily disable for testing:**
```sql
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- Test if tasks can be inserted
-- Then re-enable: ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### 4. Check User Authentication

Tasks require a logged-in user. Verify:

1. User is authenticated (check browser console for user object)
2. User has a profile in the `profiles` table
3. User ID matches between auth and profiles

**Check in browser console:**
```javascript
// In browser console after login
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);

// Check profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();
console.log('Profile:', profile);
```

### 5. Check Browser Console for Errors

Open browser DevTools (F12) and check:

1. **Network tab**: Look for failed requests to Supabase
2. **Console tab**: Look for error messages
3. **Application tab**: Check localStorage for Supabase session

### 6. Test Database Connection Manually

In browser console:

```javascript
import { supabase } from './src/integrations/supabase/client';

// Test connection
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .limit(1);

console.log('Connection test:', { data, error });

// Test insert (if user is logged in)
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data: newTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      name: 'Test Task',
      category: 'gst',
      deadline: new Date().toISOString(),
      recurrence: 'one-time',
    })
    .select()
    .single();
  
  console.log('Insert test:', { newTask, insertError });
}
```

### 7. Check Category Format

The database uses `income_tax` but the frontend uses `income-tax`. The hook should convert this automatically, but verify:

- Database expects: `gst`, `income_tax`, `insurance`, `transport`
- Frontend sends: `gst`, `income-tax`, `insurance`, `transport`
- Conversion happens in `useTasks.ts` hook

### 8. Verify RLS Policy for INSERT

Check the INSERT policy allows users to insert their own tasks:

```sql
-- Should allow: user_id = auth.uid()
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tasks' 
AND cmd = 'INSERT';
```

### 9. Check for Foreign Key Constraints

Ensure the user_id exists in profiles table:

```sql
-- Check if user profile exists
SELECT id, email, role 
FROM profiles 
WHERE id = 'your-user-id-here';
```

### 10. Enable Detailed Logging

Add more console logs to track the issue:

1. Check `src/hooks/useTasks.ts` - logs are already added
2. Check browser console when adding a task
3. Look for specific error messages

### 11. Test with Supabase Dashboard

1. Go to Supabase Dashboard > Table Editor
2. Try inserting a task manually
3. If manual insert works, the issue is in the frontend code
4. If manual insert fails, the issue is in database configuration

### 12. Check Network Requests

In browser DevTools > Network tab:

1. Filter by "supabase"
2. Look for POST requests to `/rest/v1/tasks`
3. Check the request payload
4. Check the response status and error message

### Quick Fix Checklist

- [ ] Environment variables are set correctly
- [ ] Migrations have been run
- [ ] User is authenticated
- [ ] User has a profile
- [ ] RLS policies allow INSERT for authenticated users
- [ ] No errors in browser console
- [ ] Network requests are successful
- [ ] Category format is correct (income-tax → income_tax)

### Still Not Working?

1. **Check Supabase Dashboard Logs:**
   - Go to Logs > Postgres Logs
   - Look for errors when trying to insert

2. **Check RLS Policy Details:**
   ```sql
   -- Get detailed policy information
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE tablename = 'tasks';
   ```

3. **Test with Service Role Key (temporarily):**
   - Create a test client with service role key
   - If this works, the issue is with RLS policies
   - **Never use service role key in production frontend!**

4. **Contact Support:**
   - Check Supabase status page
   - Review Supabase documentation
   - Check GitHub issues for similar problems
