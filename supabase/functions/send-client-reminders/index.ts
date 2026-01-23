import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// --- SECURITY: Rate Limiting ---
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

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

// --- Input Validation Schema ---
const RecipientSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    tasks: z.array(z.string()).optional(),
});

const RequestSchema = z.object({
    recipients: z.array(RecipientSchema).min(1).max(50),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
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

    // 🛡️ Rate Limiting
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(clientIp)) {
        return new Response(
            JSON.stringify({ error: "Too many requests. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } }
        );
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const resendKey = Deno.env.get("RESEND_API_KEY");

        if (!supabaseUrl || !serviceRoleKey || !resendKey) {
            return new Response(
                JSON.stringify({ error: "Missing server configuration" }),
                { status: 500, headers: corsHeaders }
            );
        }

        // 🔐 Auth: Require Admin role
        const authHeader = req.headers.get("Authorization") ?? "";
        const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (!user || authError) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: corsHeaders }
            );
        }

        const { data: profile } = await supabaseUser
            .from("profiles")
            .select("role, organization_id")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response(
                JSON.stringify({ error: "Admin access required" }),
                { status: 403, headers: corsHeaders }
            );
        }

        // 🛡️ Validate Input
        let payload;
        try {
            const rawBody = await req.json();
            payload = RequestSchema.parse(rawBody);
        } catch (err: any) {
            return new Response(
                JSON.stringify({ error: "Invalid request", details: err.errors }),
                { status: 400, headers: corsHeaders }
            );
        }

        const { recipients, subject, body } = payload;

        console.log(`Admin ${user.email} sending client reminders to ${recipients.length} recipients`);

        let sent = 0;
        const errors: string[] = [];

        for (const recipient of recipients) {
            try {
                // Build task list for email
                const taskList = recipient.tasks?.length
                    ? `<ul>${recipient.tasks.map(t => `<li>${t}</li>`).join("")}</ul>`
                    : "";

                const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Compliance Reminder</h2>
            <p>Dear ${recipient.name},</p>
            <div style="white-space: pre-wrap;">${body.replace(/\n/g, "<br>")}</div>
            ${taskList ? `<h3>Your Pending Tasks:</h3>${taskList}` : ""}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px;">
              This is an automated reminder from Compliance Tracker.
            </p>
          </div>
        `;

                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${resendKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Compliance Tracker <onboarding@resend.dev>",
                        to: recipient.email,
                        subject: subject,
                        html: htmlBody,
                    }),
                });

                if (res.ok) {
                    sent++;
                    console.log(`✅ Email sent to ${recipient.email}`);
                } else {
                    const errorData = await res.json();
                    console.error(`❌ Failed to send to ${recipient.email}:`, errorData);
                    errors.push(`${recipient.email}: ${errorData.message || "Send failed"}`);
                }

                // Rate limit to Resend API
                await new Promise((r) => setTimeout(r, 500));
            } catch (err: any) {
                console.error(`Error sending to ${recipient.email}:`, err);
                errors.push(`${recipient.email}: ${err.message}`);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent,
                failed: recipients.length - sent,
                errors: errors.length > 0 ? errors : undefined,
            }),
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
