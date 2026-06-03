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
import { useSession } from "./session-context";
import type { AppRole } from "./types";

interface RoleGateProps {
  allowed: AppRole[];
  children: ReactNode;
  title?: string;
  redirectTo?: string;
}

export function RoleGate({
  allowed,
  children,
  title = "Acesso restrito",
  redirectTo = "/dashboard/colaborador",
}: RoleGateProps) {
  const { user, isColaborador } = useSession();

  if (!allowed.includes(user.role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Seu perfil ({user.role}) não tem permissão para esta área.
              {isColaborador && " Colaboradores acessam apenas Chats."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={redirectTo}>Voltar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
