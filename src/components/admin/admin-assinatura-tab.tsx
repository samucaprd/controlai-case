import { Check, CreditCard, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatPlanoPreco } from "@/features/master/format";
import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";

interface AdminAssinaturaTabProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function statusBadge(status: string, isActive: boolean) {
  if (!isActive || status === "suspensa") {
    return (
      <Badge variant="destructive" className="font-normal">
        {status === "suspensa" ? "Suspensa" : "Inativa"}
      </Badge>
    );
  }
  if (status === "trial") {
    return (
      <Badge variant="secondary" className="font-normal">
        Trial
      </Badge>
    );
  }
  return (
    <Badge className="bg-primary/15 text-primary hover:bg-primary/15 font-normal">
      Ativa
    </Badge>
  );
}

export function AdminAssinaturaTab({ info, isLoading }: AdminAssinaturaTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!info) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          Não foi possível carregar os dados da assinatura.
        </CardContent>
      </Card>
    );
  }

  const hasStripe = Boolean(info.stripeCustomerId);

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plano atual
              </CardTitle>
              <CardDescription className="mt-1">
                Status da assinatura e limites do seu tenant
              </CardDescription>
            </div>
            {statusBadge(info.status, info.isActive)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: info.planoCor ?? "#6B7280" }}
            />
            <span className="text-2xl font-bold">{info.planoNome}</span>
            <span className="text-xl text-muted-foreground">
              {formatPlanoPreco(info.precoMensal)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Adesão</p>
              <p className="font-medium mt-1">{formatDate(info.dataAdesao)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Próxima cobrança</p>
              <p className="font-medium mt-1">
                {info.proximaCobranca ? formatDate(info.proximaCobranca) : "Não agendada"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Usuários</p>
              <p className="font-medium mt-1">
                {info.maxUsuarios >= 9999 ? "Ilimitados" : `Até ${info.maxUsuarios}`}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Agentes IA</p>
              <p className="font-medium mt-1">Até {info.maxAgentes}</p>
            </div>
          </div>

          {info.features.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Recursos incluídos
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {info.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Pagamentos (Stripe)</CardTitle>
          <CardDescription>
            Checkout, portal de cobrança e sincronização automática serão habilitados na Fase 6
            (Billing Stripe).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border p-4">
            <div>
              <p className="text-sm font-medium">
                {hasStripe ? "Conta Stripe vinculada" : "Sem conta Stripe vinculada"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasStripe
                  ? `Customer ID: ${info.stripeCustomerId}`
                  : "Assinaturas pagas exigirão integração Stripe."}
              </p>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          {info.precoMensal > 0 && !hasStripe && (
            <p className="text-xs text-muted-foreground mt-3">
              Valor do plano: {formatBRL(info.precoMensal)}/mês — cobrança manual até ativação do
              Stripe.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
