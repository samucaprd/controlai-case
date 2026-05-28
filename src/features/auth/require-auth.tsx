import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando sessão...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
