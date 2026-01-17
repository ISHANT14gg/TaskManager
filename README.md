# Compliance Tracker

A comprehensive task management system for Indian statutory compliance deadlines including GST, Income Tax, Insurance, and Transport requirements.

## Features

- ✅ **Task Management**: Create, update, and track compliance tasks
- ✅ **Priority-Based Dashboard**: Tasks organized by urgency (Urgent, Warning, Upcoming, Normal)
- ✅ **User Authentication**: Secure signup, login, password reset, and email verification
- ✅ **Admin Dashboard**: User management and system administration
- ✅ **Email Reminders**: Automated email notifications for tasks due within 5 days
- ✅ **Role-Based Access**: Admin and user roles with appropriate permissions

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Routing**: React Router
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd compliance-companion-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` folder
   - Deploy the edge function (see Email Setup below)

5. **Start development server**
   ```bash
   npm run dev
   ```

## Database Setup

Run all migrations in order:

```bash
supabase db push
```

This will create:
- `profiles` table (user profiles with roles)
- `tasks` table (compliance tasks)
- `notification_logs` table (email notification tracking)
- RLS policies and security functions

## Email Setup

### 1. Deploy Edge Function

```bash
supabase functions deploy send-task-reminders
```

### 2. Configure Email Service

Set your email service API key:

```bash
supabase secrets set RESEND_API_KEY=your_api_key_here
```

### 3. Update Email Settings

Edit `supabase/functions/send-task-reminders/index.ts` and update the `from` email address.

### 4. Set Up Cron Job

Configure a daily cron job to send reminders (see `EMAIL_SETUP.md` for details).

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Supabase client and types
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   └── utils/          # Helper utilities
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Set Environment Variables in Vercel**
   - Go to Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-public-key
     ```

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

## Troubleshooting

### Email Reminders Not Working
- Verify `RESEND_API_KEY` is set in Supabase Secrets
- Check Edge Function logs: Supabase Dashboard → Functions → send-task-reminders → Logs
- Ensure `notify_email` is enabled in user profiles
- Tasks must be due within 5 days to trigger reminders

### CORS Errors
- Make sure Edge Function is deployed: `supabase functions deploy send-task-reminders`
- Verify environment variables are correct in `.env`

## License

MIT
