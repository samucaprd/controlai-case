import { Navigate, Outlet } from "react-router-dom";
import { useAuth, getDashboardPathForRole } from "./auth-context";
import type { AppRole } from "@/lib/supabase/database.types";

interface RequireRoleProps {
  allowed: AppRole[];
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const { role, isLoading, perfil } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!perfil || !role) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!allowed.includes(role)) {
    return <Navigate to={getDashboardPathForRole(role)} replace />;
  }

  return <Outlet />;
}
