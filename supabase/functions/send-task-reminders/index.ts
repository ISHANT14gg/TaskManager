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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    // 🔐 Auth check (manual)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 👑 Admin check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin only" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 📅 Tasks due in 5 days
    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);

    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        name,
        deadline,
        profiles ( email, full_name )
      `)
      .eq("completed", false)
      .gte("deadline", today.toISOString())
      .lte("deadline", fiveDaysLater.toISOString());

    let sent = 0;

    for (const task of tasks ?? []) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Compliance Tracker <onboarding@resend.dev>",
          to: task.profiles.email,
          subject: `⏰ Task due soon: ${task.name}`,
          html: `
            <p>Hello ${task.profiles.full_name || "User"},</p>
            <p>Your task <b>${task.name}</b> is due on
            <b>${new Date(task.deadline).toDateString()}</b>.</p>
          `,
        }),
      });
      sent++;
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
