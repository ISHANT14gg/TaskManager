import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session (important for reset password)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔄 Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 🔑 HANDLE RESET PASSWORD ROUTE (NO REACT ROUTER)
  const path = window.location.pathname;

  if (path === "/reset-password") {
    return <ResetPassword />;
  }

  // 🔐 Not logged in
  if (!session) {
    return <Auth />;
  }

  // ✅ Logged in
  return <Index />;
}
