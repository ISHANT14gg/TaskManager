// Google Calendar Service - Frontend utilities for calendar integration
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1";

// Check if user has Google Calendar connected
export async function checkGoogleConnection(userId: string): Promise<{
    connected: boolean;
    syncEnabled: boolean;
    reminderDays: number[];
}> {
    const { data, error } = await supabase
        .from("user_google_tokens")
        .select("sync_enabled, reminder_days")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        return { connected: false, syncEnabled: false, reminderDays: [1] };
    }

    return {
        connected: true,
        syncEnabled: data.sync_enabled,
        reminderDays: data.reminder_days || [1],
    };
}

// Initiate Google OAuth flow
export async function initiateGoogleAuth(userId: string): Promise<void> {
    try {
        const { data, error } = await supabase.functions.invoke('google-oauth-start', {
            body: { userId },
        });

        if (error) {
            console.error("Function error:", error);
            throw new Error(error.message || "Failed to initiate Google OAuth");
        }

        const { authUrl } = data;

        // Redirect to Google consent screen
        window.location.href = authUrl;
    } catch (error) {
        console.error("Error initiating Google auth:", error);
        throw error;
    }
}

// Disconnect Google Calendar
export async function disconnectGoogle(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from("user_google_tokens")
        .delete()
        .eq("user_id", userId);

    return !error;
}

// Update sync settings
export async function updateSyncSettings(
    userId: string,
    syncEnabled: boolean,
    reminderDays: number[]
): Promise<boolean> {
    const { error } = await supabase
        .from("user_google_tokens")
        .update({
            sync_enabled: syncEnabled,
            reminder_days: reminderDays,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    return !error;
}

// Sync a task to Google Calendar
export async function syncTaskToCalendar(
    task: {
        id: string;
        name: string;
        description?: string;
        category: string;
        client_name?: string;
        deadline: string;
        completed: boolean;
        user_id: string;
        google_event_id?: string;
    },
    action: "create" | "update" | "delete"
): Promise<{ success: boolean; eventId?: string; reason?: string; error?: string; htmlLink?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('sync-calendar-event', {
            body: { task, action },
        });

        if (error) {
            console.error("Function error:", error);
            // If function call fails (e.g. 500), try to extract meaningful error from body if possible, 
            // otherwise default to network_error
            return { success: false, reason: "api_error" };
        }

        return data; // formatted as { success: boolean; ... }
    } catch (error) {
        console.error("Error syncing task to calendar:", error);
        return { success: false, reason: "network_error", error: error.message };
    }
}
