import { supabase } from "@/integrations/supabase/client";

export async function triggerEmailReminders(targetUserId?: string): Promise<{
  success: boolean;
  message: string;
  sent?: number;
}> {
  try {
    // 🔐 This automatically attaches the logged-in user's access token
    const { data, error } = await supabase.functions.invoke(
      "send-task-reminders",
      {
        body: { targetUserId },
      }
    );

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    return {
      success: true,
      message: "Email reminders sent successfully",
      sent: data?.sent ?? 0,
    };
  } catch (err: any) {
    console.error("Email reminder error:", err);
    return {
      success: false,
      message: err.message || "Failed to send reminders",
    };
  }
}
