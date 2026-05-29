import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "./auth-context";
import type { AppRole } from "@/lib/supabase/database.types";

interface RoleGateProps {
  allowed: AppRole[];
  children: ReactNode;
  title?: string;
}

export function RoleGate({ allowed, children, title = "Acesso restrito" }: RoleGateProps) {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!role || !allowed.includes(role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Seu perfil ({role ?? "sem role"}) não tem permissão para esta área.
              Use o menu para acessar as seções disponíveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/dashboard">Ir para Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
