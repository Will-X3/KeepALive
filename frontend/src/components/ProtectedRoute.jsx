import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StateMessage from "./StateMessage";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <StateMessage title="Loading…" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
