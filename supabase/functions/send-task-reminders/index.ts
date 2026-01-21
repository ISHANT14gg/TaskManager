import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      console.error("Missing config:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
        hasResend: !!resendKey
      });
      return new Response(
        JSON.stringify({ error: "Missing environment variables (Service Key or Resend Key)" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔐 Auth check (manual) using User Context
    const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 👑 Admin check
    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      console.log(`User ${user.id} is not admin`);
      return new Response(
        JSON.stringify({ error: "Admin only" }),
        { status: 403, headers: corsHeaders }
      );
    }
    console.log(`Admin authorized: ${user.email}`);

    // 🤖 Use Service Role for data fetching (Bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 📅 Tasks due in 5 days (including passed deadlines from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    // Get optional target user ID
    const { targetUserId } = await req.json().catch(() => ({ targetUserId: null }));

    console.log(`Searching for tasks between ${today.toISOString()} and ${fiveDaysLater.toISOString()}`);
    if (targetUserId) console.log(`Targeting specific user: ${targetUserId}`);

    let query = supabaseAdmin
      .from("tasks")
      .select(`
        name,
        deadline,
        profiles!tasks_user_id_fkey ( email, full_name )
      `)
      .eq("completed", false)
      .gte("deadline", today.toISOString())
      .lte("deadline", fiveDaysLater.toISOString());

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: tasks, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching tasks:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${tasks?.length ?? 0} tasks`);

    let sent = 0;

    for (const task of tasks ?? []) {
      const deadlineDate = new Date(task.deadline);
      const timeDiff = deadlineDate.getTime() - new Date().getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

      console.log(`Sending email for task '${task.name}' to ${task.profiles.email} (Days remaining: ${daysRemaining})`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Compliance Tracker <onboarding@resend.dev>",
          to: task.profiles.email,
          subject: `⏰ Task Due: ${task.name} (${daysRemaining} days remaining)`,
          html: `
            <p>Hello ${task.profiles.full_name || "User"},</p>
            <p>Your task <b>${task.name}</b> is due in <b>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</b>.</p>
            <p>Deadline: ${deadlineDate.toDateString()}</p>
          `,
        }),
      });

      if (res.ok) {
        console.log(`Email sent successfully to ${task.profiles.email}`);
        sent++;
      } else {
        const errorText = await res.text();
        console.error(`Failed to send email to ${task.profiles.email}:`, errorText);
      }

      // ⏳ Rate limit avoidance (Resend free tier)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
