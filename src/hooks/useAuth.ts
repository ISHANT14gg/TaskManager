import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  organization_id: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("CRITICAL: Error fetching profile:", error);
      // Log more details if available
      if (error.message) console.error("Message:", error.message);
      if (error.details) console.error("Details:", error.details);
      if (error.hint) console.error("Hint:", error.hint);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // 🛡️ SECURITY: Global scope invalidates session on Supabase server
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    } catch (err) {
      console.warn("Supabase signOut failed or already cleared", err);
    } finally {
      // 🔥 CLEAR LOCAL STATE
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/auth"; // Redirect to login
    }
  };

  const isAdmin = profile?.role === "admin";

  return {
    user,
    profile,
    loading,
    isAdmin,
    signOut,
  };
}
