// Sync Calendar Event - Creates/Updates/Deletes Google Calendar events for tasks
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskData {
    id: string;
    name: string;
    description?: string;
    category: string;
    client_name?: string;
    deadline: string;
    completed: boolean;
    user_id: string;
    google_event_id?: string;
}

// Refresh access token if expired
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        if (!response.ok) {
            console.error("Token refresh failed:", await response.text());
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
}

// Build calendar event from task data
function buildCalendarEvent(task: TaskData, reminderDays: number[]) {
    const description = [
        `Category: ${task.category}`,
        task.client_name ? `Client: ${task.client_name}` : null,
        task.description ? `\n${task.description}` : null,
    ].filter(Boolean).join("\n");

    // Build reminder overrides (in minutes)
    const reminders = reminderDays.map(days => ({
        method: "popup",
        minutes: days * 24 * 60, // Convert days to minutes
    }));

    return {
        summary: task.client_name
            ? `${task.name} - ${task.client_name}`
            : task.name,
        description,
        start: {
            date: task.deadline.split("T")[0], // All-day event
        },
        end: {
            // Google Calendar end date is exclusive, so we need to add 1 day
            date: new Date(new Date(task.deadline).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        reminders: {
            useDefault: false,
            overrides: reminders,
        },
    };
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { task, action } = await req.json() as { task: TaskData; action: "create" | "update" | "delete" };

        if (!task || !action) {
            return new Response(
                JSON.stringify({ error: "task and action are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get user's Google tokens
        const { data: tokenData, error: tokenError } = await supabase
            .from("user_google_tokens")
            .select("*")
            .eq("user_id", task.user_id)
            .single();

        if (tokenError || !tokenData) {
            console.log(`No Google Calendar connected for user ${task.user_id}`);
            return new Response(
                JSON.stringify({ success: false, reason: "no_google_connection" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if sync is enabled
        if (!tokenData.sync_enabled) {
            return new Response(
                JSON.stringify({ success: false, reason: "sync_disabled" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if token is expired and refresh if needed
        let accessToken = tokenData.access_token;
        const expiresAt = new Date(tokenData.token_expires_at);

        if (expiresAt < new Date()) {
            console.log("Token expired, refreshing...");
            accessToken = await refreshAccessToken(tokenData.refresh_token);

            if (!accessToken) {
                // Token refresh failed, mark connection as invalid
                await supabase
                    .from("user_google_tokens")
                    .update({ sync_enabled: false })
                    .eq("user_id", task.user_id);

                return new Response(
                    JSON.stringify({ success: false, reason: "token_refresh_failed" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Update stored access token
            await supabase
                .from("user_google_tokens")
                .update({
                    access_token: accessToken,
                    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                })
                .eq("user_id", task.user_id);
        }

        const calendarId = tokenData.calendar_id || "primary";
        const calendarBaseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

        console.log(`Syncing task ${task.id} to calendar ${calendarId} (Action: ${action})`);

        let result: { eventId?: string; success: boolean; error?: string; htmlLink?: string } = { success: false };

        if (action === "create") {
            // Create new calendar event
            const event = buildCalendarEvent(task, tokenData.reminder_days || [1]);

            const response = await fetch(calendarBaseUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });

            if (response.ok) {
                const createdEvent = await response.json();
                result = { success: true, eventId: createdEvent.id, htmlLink: createdEvent.htmlLink };

                // Update task with google_event_id
                await supabase
                    .from("tasks")
                    .update({
                        google_event_id: createdEvent.id,
                        google_sync_status: "synced",
                        google_last_synced_at: new Date().toISOString(),
                    })
                    .eq("id", task.id);
            } else {
                const errorText = await response.text();
                console.error(`FAILED to create event for task ${task.id}:`, errorText);
                result = { success: false, error: errorText };

                await supabase
                    .from("tasks")
                    .update({
                        google_sync_status: "error",
                        google_sync_error: errorText,
                    })
                    .eq("id", task.id);
            }
        } else if (action === "update" && task.google_event_id) {
            // Update existing calendar event
            const event = buildCalendarEvent(task, tokenData.reminder_days || [1]);

            const response = await fetch(`${calendarBaseUrl}/${task.google_event_id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });

            if (response.ok) {
                result = { success: true, eventId: task.google_event_id };

                await supabase
                    .from("tasks")
                    .update({
                        google_sync_status: "synced",
                        google_last_synced_at: new Date().toISOString(),
                    })
                    .eq("id", task.id);
            } else {
                const errorText = await response.text();
                console.error("Failed to update event:", errorText);
                result = { success: false, error: errorText };
            }
        } else if (action === "delete" && task.google_event_id) {
            // Delete calendar event (when task is completed or deleted)
            const response = await fetch(`${calendarBaseUrl}/${task.google_event_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok || response.status === 404) {
                result = { success: true };

                await supabase
                    .from("tasks")
                    .update({
                        google_event_id: null,
                        google_sync_status: "deleted",
                        google_last_synced_at: new Date().toISOString(),
                    })
                    .eq("id", task.id);
            } else {
                const errorText = await response.text();
                console.error("Failed to delete event:", errorText);
                result = { success: false, error: errorText };
            }
        }

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error in sync-calendar-event:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
