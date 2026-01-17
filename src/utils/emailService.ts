export async function triggerEmailReminders(): Promise<{
  success: boolean;
  message: string;
  emailsSent?: number;
}> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl,
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        `Missing environment variables: ${!supabaseUrl ? "VITE_SUPABASE_URL " : ""}${!supabaseKey ? "VITE_SUPABASE_ANON_KEY" : ""}`
      );
    }

    const functionUrl = `${supabaseUrl}/functions/v1/send-task-reminders`;
    console.log("Calling function:", functionUrl);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({}),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", {
      "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
      "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: response.statusText };
    }
    
    console.log("Response data:", data);

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || `Server error: ${response.status}`
      );
    }

    return {
      success: true,
      message: data.message || "Email reminders sent successfully",
      emailsSent: data.sent || data.emailsSent || 0,
    };
  } catch (error: any) {
    console.error("triggerEmailReminders error:", error);
    return {
      success: false,
      message: error.message || "Failed to send email reminders",
    };
  }
}
