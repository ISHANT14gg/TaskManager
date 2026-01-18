import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: JSX.Element;
}

export default function ProtectedAdminRoute({ children }: Props) {
  const { loading, user, isAdmin } = useAuth();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
