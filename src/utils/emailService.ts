/**
 * Email service utility
 * This can be used to trigger email reminders manually or integrate with your email service
 */

import { supabase } from "@/integrations/supabase/client";

export interface TaskReminder {
  taskId: string;
  userId: string;
  userEmail: string;
  userName: string;
  taskName: string;
  taskCategory: string;
  deadline: Date;
  daysUntilDeadline: number;
}

/**
 * Get tasks that need reminders (due within 5 days)
 */
export async function getTasksForReminders(): Promise<TaskReminder[]> {
  try {
    const { data, error } = await supabase.rpc("get_tasks_for_reminders");

    if (error) throw error;

    return (data || []).map((task: any) => ({
      taskId: task.task_id,
      userId: task.user_id,
      userEmail: task.user_email,
      userName: task.user_name,
      taskName: task.task_name,
      taskCategory: task.task_category,
      deadline: new Date(task.deadline),
      daysUntilDeadline: task.days_until_deadline,
    }));
  } catch (error) {
    console.error("Error fetching tasks for reminders:", error);
    return [];
  }
}

/**
 * Trigger email reminders via Supabase Edge Function
 * Make sure the edge function is deployed and configured
 */
export async function triggerEmailReminders(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    // Get the Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing. Please check your environment variables.");
    }

    // Get current user session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("You must be logged in to send reminders.");
    }

    // Call the edge function
    const functionUrl = `${supabaseUrl}/functions/v1/send-task-reminders`;
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to send email reminders";
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }

      // Check if function doesn't exist
      if (response.status === 404) {
        errorMessage = "Edge function not found. Please deploy the 'send-task-reminders' function first.";
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || "Email reminders sent successfully",
      data,
    };
  } catch (error: any) {
    console.error("Error triggering email reminders:", error);
    return {
      success: false,
      message: error.message || "Failed to send email reminders. Please check if the edge function is deployed.",
    };
  }
}

/**
 * Log notification attempt
 */
export async function logNotification(
  userId: string,
  taskId: string,
  channel: "email" | "whatsapp",
  status: "sent" | "failed" | "pending",
  message?: string,
  errorMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("notification_logs").insert({
      user_id: userId,
      task_id: taskId,
      channel,
      status,
      message: message || null,
      error_message: errorMessage || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error logging notification:", error);
    return false;
  }
}
