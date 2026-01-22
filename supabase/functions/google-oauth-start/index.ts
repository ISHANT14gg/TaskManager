// Google OAuth Start - Redirects user to Google consent screen
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get user_id from the request body
        const { userId } = await req.json();

        if (!userId) {
            return new Response(
                JSON.stringify({ error: "user_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build Google OAuth URL
        const scopes = [
            "https://www.googleapis.com/auth/calendar.events"
        ];

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", scopes.join(" "));
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", userId); // Pass user_id in state

        // Return the auth URL for the frontend to redirect
        return new Response(
            JSON.stringify({ authUrl: authUrl.toString() }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        console.error("Error in google-oauth-start:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
