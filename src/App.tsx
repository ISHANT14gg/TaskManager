import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./integrations/supabase/client";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/auth"
        element={session ? <Navigate to="/" /> : <Auth />}
      />

      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected */}
      <Route
        path="/"
        element={session ? <Index /> : <Navigate to="/auth" />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
