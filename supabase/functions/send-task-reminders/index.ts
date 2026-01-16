import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(emailData: EmailData): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Compliance Tracker <noreply@yourdomain.com>",
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all tasks that are due within 5 days and not completed
    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        *,
        profiles!inner (
          id,
          email,
          full_name,
          notify_email
        )
      `)
      .eq("completed", false)
      .eq("profiles.notify_email", true)
      .gte("deadline", today.toISOString())
      .lte("deadline", fiveDaysLater.toISOString());

    if (tasksError) {
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No tasks to notify", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    // Group tasks by user
    const tasksByUser = new Map();
    for (const task of tasks) {
      const userId = task.user_id;
      if (!tasksByUser.has(userId)) {
        tasksByUser.set(userId, {
          profile: task.profiles,
          tasks: [],
        });
      }
      tasksByUser.get(userId).tasks.push(task);
    }

    // Send emails to each user
    for (const [userId, { profile, tasks: userTasks }] of tasksByUser) {
      // Check if we already sent a notification today for these tasks
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingLogs } = await supabase
        .from("notification_logs")
        .select("task_id")
        .eq("user_id", userId)
        .eq("channel", "email")
        .eq("status", "sent")
        .gte("sent_at", todayStart.toISOString())
        .in(
          "task_id",
          userTasks.map((t: any) => t.id)
        );

      const notifiedTaskIds = new Set(
        existingLogs?.map((log) => log.task_id) || []
      );

      // Filter out tasks that already have notifications today
      const tasksToNotify = userTasks.filter(
        (t: any) => !notifiedTaskIds.has(t.id)
      );

      if (tasksToNotify.length === 0) continue;

      // Calculate days until deadline for each task
      const tasksWithDays = tasksToNotify.map((task: any) => {
        const deadline = new Date(task.deadline);
        const daysLeft = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...task, daysLeft };
      });

      // Sort by urgency
      tasksWithDays.sort((a, b) => a.daysLeft - b.daysLeft);

      // Generate email HTML
      const urgentTasks = tasksWithDays.filter((t) => t.daysLeft <= 1);
      const warningTasks = tasksWithDays.filter(
        (t) => t.daysLeft > 1 && t.daysLeft <= 3
      );
      const upcomingTasks = tasksWithDays.filter(
        (t) => t.daysLeft > 3 && t.daysLeft <= 5
      );

      let emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .task-list { margin: 15px 0; }
            .task-item { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #2563eb; }
            .urgent { border-left-color: #dc2626; }
            .warning { border-left-color: #f59e0b; }
            .upcoming { border-left-color: #eab308; }
            .task-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .task-details { color: #6b7280; font-size: 14px; }
            .days-left { font-weight: bold; color: #dc2626; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Compliance Task Reminders</h1>
            </div>
            <div class="content">
              <p>Hello ${profile.full_name || "User"},</p>
              <p>You have <strong>${tasksWithDays.length}</strong> task(s) with upcoming deadlines:</p>
      `;

      if (urgentTasks.length > 0) {
        emailHtml += `
          <h3 style="color: #dc2626; margin-top: 20px;">🔴 Urgent - Action Required</h3>
          <div class="task-list">
        `;
        urgentTasks.forEach((task) => {
          emailHtml += `
            <div class="task-item urgent">
              <div class="task-name">${task.name}</div>
              <div class="task-details">
                <span class="days-left">${task.daysLeft === 0 ? "Due Today!" : `Due in ${task.daysLeft} day(s)`}</span><br>
                Category: ${task.category.replace("_", " ").toUpperCase()}<br>
                Deadline: ${new Date(task.deadline).toLocaleDateString()}
                ${task.description ? `<br>${task.description}` : ""}
              </div>
            </div>
          `;
        });
        emailHtml += `</div>`;
      }

      if (warningTasks.length > 0) {
        emailHtml += `
          <h3 style="color: #f59e0b; margin-top: 20px;">⚠️ Warning - Due Soon</h3>
          <div class="task-list">
        `;
        warningTasks.forEach((task) => {
          emailHtml += `
            <div class="task-item warning">
              <div class="task-name">${task.name}</div>
              <div class="task-details">
                Due in ${task.daysLeft} day(s)<br>
                Category: ${task.category.replace("_", " ").toUpperCase()}<br>
                Deadline: ${new Date(task.deadline).toLocaleDateString()}
                ${task.description ? `<br>${task.description}` : ""}
              </div>
            </div>
          `;
        });
        emailHtml += `</div>`;
      }

      if (upcomingTasks.length > 0) {
        emailHtml += `
          <h3 style="color: #eab308; margin-top: 20px;">📅 Upcoming</h3>
          <div class="task-list">
        `;
        upcomingTasks.forEach((task) => {
          emailHtml += `
            <div class="task-item upcoming">
              <div class="task-name">${task.name}</div>
              <div class="task-details">
                Due in ${task.daysLeft} day(s)<br>
                Category: ${task.category.replace("_", " ").toUpperCase()}<br>
                Deadline: ${new Date(task.deadline).toLocaleDateString()}
                ${task.description ? `<br>${task.description}` : ""}
              </div>
            </div>
          `;
        });
        emailHtml += `</div>`;
      }

      emailHtml += `
              <p style="margin-top: 20px;">
                <a href="${SUPABASE_URL.replace("/rest/v1", "")}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Dashboard
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from Compliance Tracker.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email
      const emailSent = await sendEmail({
        to: profile.email,
        subject: `Compliance Reminder: ${tasksWithDays.length} Task(s) Due Soon`,
        html: emailHtml,
      });

      // Log notifications
      const logs = tasksToNotify.map((task: any) => ({
        user_id: userId,
        task_id: task.id,
        channel: "email",
        status: emailSent ? "sent" : "failed",
        message: emailSent
          ? `Reminder sent for task: ${task.name}`
          : "Failed to send email",
        error_message: emailSent ? null : "Email service error",
      }));

      if (logs.length > 0) {
        await supabase.from("notification_logs").insert(logs);
      }

      if (emailSent) {
        successCount += tasksToNotify.length;
      } else {
        failCount += tasksToNotify.length;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Email reminders processed",
        success: successCount,
        failed: failCount,
        total: successCount + failCount,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
