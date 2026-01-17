import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // ✅ CORS preflight (THIS IS THE KEY FIX)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id,
        name,
        deadline,
        user_id,
        profiles (
          email,
          full_name,
          notify_email
        )
      `)
      .eq("completed", false)
      .eq("profiles.notify_email", true)
      .gte("deadline", today.toISOString())
      .lte("deadline", fiveDaysLater.toISOString());

    if (error) {
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

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
          subject: `Task due soon: ${task.name}`,
          html: `<p>Hello ${task.profiles.full_name || "User"},<br/>
                 Your task <b>${task.name}</b> is due on
                 ${new Date(task.deadline).toDateString()}</p>`,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: tasks?.length ?? 0,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
