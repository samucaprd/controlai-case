import { Navigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth, getDashboardPathForRole } from "./auth-context";
import type { AppRole } from "@/lib/supabase/database.types";

interface RequireRoleProps {
  allowed: AppRole[];
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const {
    role,
    isLoading,
    perfil,
    session,
    profileError,
    signOut,
    refreshProfile,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (session && !perfil) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <CardTitle>Conta incompleta</CardTitle>
            <CardDescription>
              Sua sessão está ativa, mas o perfil da empresa ainda não foi
              provisionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError && (
              <p className="text-sm text-destructive">{profileError}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Tente novamente em instantes ou cadastre-se com outro email. Se o
              problema persistir, contate o suporte.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void refreshProfile()}>
                Tentar novamente
              </Button>
              <Button variant="destructive" onClick={() => void signOut()}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!perfil || !role) {
    return null;
  }

  if (!allowed.includes(role)) {
    return <Navigate to={getDashboardPathForRole(role)} replace />;
  }

  return <Outlet />;
}
