import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "sonner";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* Public */}
        <Route
          path="/auth"
          element={!user ? <Auth /> : <Navigate to="/" />}
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* User Dashboard */}
        <Route
          path="/"
          element={user ? <Index /> : <Navigate to="/auth" />}
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={user ? <Settings /> : <Navigate to="/auth" />}
        />

        {/* 🔐 Admin Protected */}
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
    </>
  );
}
