// Google OAuth Callback - Exchanges code for tokens and stores them
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:8080";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const userId = url.searchParams.get("state"); // user_id passed in state
        const error = url.searchParams.get("error");

        // Handle user denied access
        if (error) {
            return Response.redirect(`${APP_URL}/settings?google_error=${error}`);
        }

        if (!code || !userId) {
            return Response.redirect(`${APP_URL}/settings?google_error=missing_params`);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error("Token exchange failed:", errorData);
            return Response.redirect(`${APP_URL}/settings?google_error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json();

        // Calculate token expiry time
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Store tokens in Supabase using service role key
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { error: upsertError } = await supabase
            .from("user_google_tokens")
            .upsert({
                user_id: userId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: expiresAt,
                sync_enabled: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id",
            });

        if (upsertError) {
            console.error("Failed to store tokens:", upsertError);
            return Response.redirect(`${APP_URL}/settings?google_error=storage_failed`);
        }

        console.log(`✅ Google Calendar connected for user ${userId}`);

        // Redirect back to app with success
        return Response.redirect(`${APP_URL}/settings?google_success=true`);
    } catch (error) {
        console.error("Error in google-oauth-callback:", error);
        return Response.redirect(`${APP_URL}/settings?google_error=unknown`);
    }
});
