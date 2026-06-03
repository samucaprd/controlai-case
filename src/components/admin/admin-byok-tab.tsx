import { Key, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";

interface AdminByokTabProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
}

export function AdminByokTab({ info, isLoading }: AdminByokTabProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  const configured = info?.chaveApiConfigurada ?? false;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          BYOK — Bring Your Own Key
        </CardTitle>
        <CardDescription>
          Utilize sua própria chave de API do provedor LLM. O cadastro criptografado será
          habilitado na Fase 3 (Gestão segura de chave LLM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {configured ? (
              <ShieldCheck className="h-8 w-8 text-primary" />
            ) : (
              <ShieldOff className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Status da chave API</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {configured
                  ? "Chave configurada no servidor (valor não exibido por segurança)."
                  : "Nenhuma chave configurada. O chat exigirá BYOK após a Fase 3."}
              </p>
            </div>
          </div>
          <Badge variant={configured ? "default" : "secondary"}>
            {configured ? "Configurada" : "Pendente"}
          </Badge>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Próximos passos (Fase 3):</strong> cadastro
            seguro via Edge Function, criptografia em repouso, validação e rotação de chave.
          </p>
          <p>
            A chave nunca será exposta no navegador — apenas um indicador de status como este.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
