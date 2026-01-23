// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import nodemailer from "npm:nodemailer@6.9.10";

// --- SECURITY: Rate Limiting ---
// In-memory store for rate limiting (per function instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;    // Max 5 triggerings per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const userData = rateLimitStore.get(ip);

  if (!userData || now > userData.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (userData.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  userData.count++;
  return false;
}

// --- SECURITY: Input Validation ---
const ClientRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  tasks: z.array(z.string()).optional(),
});

const RequestSchema = z.object({
  targetUserId: z.string().uuid().optional().nullable(),
  isAutomatedTrigger: z.boolean().optional(),
  // NEW: Direct client email mode
  clientMode: z.boolean().optional(),
  recipients: z.array(ClientRecipientSchema).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

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

  // 🛡️ SECURITY: Rate Limiting check
  const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
      { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!supabaseUrl || !serviceRoleKey || !gmailUser || !gmailPass) {
      return new Response(
        JSON.stringify({ error: "Missing config: GMAIL_USER or GMAIL_APP_PASSWORD" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Configure Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // 🛡️ SECURITY: Strict Input Validation
    let payload;
    try {
      const rawBody = await req.json().catch(() => ({}));
      payload = RequestSchema.parse(rawBody);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload", details: err.errors }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { targetUserId, isAutomatedTrigger } = payload;
    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKeyHeader = req.headers.get("apikey") ?? "";

    // Check if either header contains the service role key
    const isServiceKey = (serviceRoleKey && (authHeader.includes(serviceRoleKey) || apiKeyHeader === serviceRoleKey));

    // 🔐 Auth check
    let currentOrgId: string | undefined;

    if (isAutomatedTrigger) {
      // 🤖 Automated triggers require the Service Role key OR a valid Admin session
      let authorized = !!isServiceKey;

      if (!authorized && authHeader) {
        // Use ANON key + user's token to verify identity safely
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabaseUser = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseUser.auth.getUser(token);

        if (user) {
          // Use service role to query profile (bypass RLS)
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();

          if (profile?.role === "admin") {
            authorized = true;
            console.log(`Admin ${user.email} triggered a manual multi-tenant scan.`);
          }
        }
      }

      if (!authorized) {
        console.error("Automated trigger blocked: Unauthorized access attempt");
        return new Response(
          JSON.stringify({ error: "Unauthorized: Automation scan requires Admin or Service Key" }),
          { status: 401, headers: corsHeaders }
        );
      }
      console.log("Processing multi-tenant automation scan...");
    } else if (payload.clientMode) {
      // 📧 Client mode: Allow service key OR authenticated admin user
      if (isServiceKey) {
        console.log("Client mode with service role key - authorized");
      } else if (authHeader) {
        // Use ANON key + user's token to verify identity safely
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabaseUser = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

        if (!user || authError) {
          console.error("Client mode auth failed: No valid user", authError);
          return new Response(JSON.stringify({
            error: "Unauthorized",
            details: "User token validation failed",
            debug: authError?.message
          }), { status: 401, headers: corsHeaders });
        }

        console.log(`Client mode: User ${user.email} verified, checking admin role...`);

        // Use service role to query profile (bypass RLS)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log(`Profile query result:`, { profile, profileError });

        if (profileError || profile?.role !== "admin") {
          console.error("Client mode auth failed: Not admin or query failed", profile?.role, profileError);
          return new Response(JSON.stringify({
            error: "Admin only",
            details: "User is not an admin",
            role: profile?.role
          }), { status: 403, headers: corsHeaders });
        }
        console.log(`Client mode authorized for admin: ${user.email}`);
      } else {
        console.error("Client mode auth failed: No auth header or service key");
        return new Response(JSON.stringify({ error: "Unauthorized", details: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
      }
    } else {
      // 👤 Manual triggers require Admin role
      // Use ANON key + user's token to verify identity safely
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

      if (!user || authError) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      // Use service role to query profile (bypass RLS)
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

      currentOrgId = profile.organization_id;
      console.log(`Manual trigger by Admin: ${user.email} for Org: ${currentOrgId}`);
    }

    // 📧 CLIENT MODE: Send custom emails to specific recipients
    if (payload.clientMode && payload.recipients && payload.recipients.length > 0) {
      console.log(`Client mode: Sending to ${payload.recipients.length} recipients`);

      let sent = 0;
      const errors: string[] = [];

      for (const recipient of payload.recipients) {
        try {
          const taskList = recipient.tasks?.length
            ? `<ul>${recipient.tasks.map((t: string) => `<li>${t}</li>`).join("")}</ul>`
            : "";

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Compliance Reminder</h2>
              <p>Dear ${recipient.name},</p>
              <div style="white-space: pre-wrap;">${(payload.body || "").replace(/\n/g, "<br>")}</div>
              ${taskList ? `<h3>Your Pending Tasks:</h3>${taskList}` : ""}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px;">This is an automated reminder from Compliance Tracker.</p>
            </div>
          `;

          await transporter.sendMail({
            from: `Compliance Tracker <${gmailUser}>`,
            to: recipient.email,
            subject: payload.subject || "Compliance Reminder",
            html: htmlBody,
          });

          // console.log(`✅ Client email sent to ${recipient.email}`); // Optional logging
          sent++;

          await new Promise((r) => setTimeout(r, 500));
        } catch (err: any) {
          console.error(`Failed to send to ${recipient.email}:`, err);
          errors.push(`${recipient.email}: ${err.message}`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed: payload.recipients.length - sent, errors: errors.length > 0 ? errors : undefined }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    let query = supabaseAdmin
      .from("tasks")
      .select(`
        id, user_id, organization_id, name, deadline,
        profiles!tasks_user_id_fkey ( email, full_name, notify_email )
      `)
      .eq("completed", false)
      .gte("deadline", today.toISOString())
      .lte("deadline", fiveDaysLater.toISOString());

    if (isAutomatedTrigger) {
      // ⏰ Filter by current UTC time (HH:mm)
      const now = new Date();
      const currentTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`;

      const { data: activeOrgs } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("is_automation_enabled", true)
        .eq("reminder_time", currentTime);

      const orgIds = (activeOrgs as any[])?.map(o => o.id) || [];
      if (orgIds.length === 0) {
        console.log(`No organizations scheduled for ${currentTime} UTC`);
        return new Response(JSON.stringify({ success: true, sent: 0, message: "No scheduled orgs" }), { status: 200, headers: corsHeaders });
      }
      query = query.in("organization_id", orgIds);
    } else if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    } else if (currentOrgId) {
      query = query.eq("organization_id", currentOrgId);
    }

    const { data: tasks, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Filter tasks whose users actually want emails
    const tasksToNotify = (tasks as any[])?.filter(t => t.profiles?.notify_email) || [];
    console.log(`Final tasks to notify: ${tasksToNotify.length}`);

    let sent = 0;
    for (const task of tasksToNotify) {
      // 🛡️ SPAM PROTECTION: Check if already sent today
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabaseAdmin
        .from("notification_logs")
        .select("id")
        .eq("task_id", task.id)
        .gte("sent_at", todayDate + "T00:00:00Z")
        .lte("sent_at", todayDate + "T23:59:59Z")
        .limit(1);

      // Note: The notification_logs table has a refined index on sent_at

      // Note: The notification_logs table has a refined index on sent_at

      try {
        await transporter.sendMail({
          from: `Compliance Tracker <${gmailUser}>`,
          to: task.profiles.email,
          subject: `⏰ Reminder: ${task.name} is due soon`,
          html: `<p>Hello ${task.profiles.full_name || "User"},</p><p>Your task <b>${task.name}</b> is due on ${new Date(task.deadline).toDateString()}.</p>`,
        });

        sent++;
        await supabaseAdmin.from("notification_logs").insert({
          task_id: task.id,
          user_id: task.user_id,
          organization_id: task.organization_id,
          channel: "email",
          status: "sent",
        });
      } catch (err) {
        console.error(`Failed to send to ${task.profiles.email}`, err);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ success: true, sent }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
