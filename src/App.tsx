import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./integrations/supabase/client";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";

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

      {/* User dashboard */}
      <Route
        path="/"
        element={session ? <Index /> : <Navigate to="/auth" />}
      />

      {/* 🔐 Admin protected route */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <Admin />
          </ProtectedAdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
