import { supabase } from "@/integrations/supabase/client";

export async function triggerEmailReminders(): Promise<{
  success: boolean;
  message: string;
  emailsSent?: number;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-task-reminders"
    );

    if (error) {
      console.error("Edge function error:", error);
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: data?.message || "Email reminders sent successfully",
      emailsSent: data?.sent || data?.emailsSent || 0,
    };
  } catch (error: any) {
    console.error("triggerEmailReminders failed:", error);
    return {
      success: false,
      message: error.message || "Failed to send email reminders",
    };
  }
}
