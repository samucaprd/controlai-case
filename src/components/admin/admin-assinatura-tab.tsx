import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatPlanoPreco } from "@/features/master/format";
import { usePublicPlanos } from "@/features/billing/use-public-planos";
import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";
import {
  createCheckoutSession,
  createPortalSession,
  isStripeSynced,
  redirectToStripe,
  StripeApiError,
} from "@/lib/api/stripe";
import { toast } from "sonner";

interface AdminAssinaturaTabProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
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
  if (status === "cancelada") {
    return (
      <Badge variant="outline" className="font-normal">
        Cancelada
      </Badge>
    );
  }
  return (
    <Badge className="bg-primary/15 text-primary hover:bg-primary/15 font-normal">
      Ativa
    </Badge>
  );
}

export function AdminAssinaturaTab({
  info,
  isLoading,
  onRefresh,
}: AdminAssinaturaTabProps) {
  const { planos: availablePlanos, isLoading: planosLoading } = usePublicPlanos();
  const [checkoutPlanoId, setCheckoutPlanoId] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleCheckout = useCallback(
    async (planoId: number) => {
      setCheckoutPlanoId(planoId);
      try {
        const result = await createCheckoutSession(planoId);
        if (result.upgraded) {
          toast.success(result.message ?? "Plano atualizado com sucesso.");
          await onRefresh?.();
          return;
        }
        if (result.url) {
          redirectToStripe(result.url);
        }
      } catch (err) {
        const message =
          err instanceof StripeApiError ? err.message : "Erro ao iniciar checkout.";
        toast.error(message);
      } finally {
        setCheckoutPlanoId(null);
      }
    },
    [onRefresh],
  );

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result.url) redirectToStripe(result.url);
    } catch (err) {
      const message =
        err instanceof StripeApiError ? err.message : "Erro ao abrir portal de cobrança.";
      toast.error(message);
    } finally {
      setPortalLoading(false);
    }
  }, []);

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
  const hasSubscription = Boolean(info.stripeSubscriptionId);
  const upgradePlanos = availablePlanos.filter(
    (p) => p.preco_mensal > 0 && p.id !== info.planoId && isStripeSynced(p.stripe_price_id),
  );

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
            Assine, altere plano, pause ou cancele diretamente pelo portal Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">
                {hasStripe ? "Conta Stripe vinculada" : "Sem conta Stripe vinculada"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasStripe
                  ? `Customer: ${info.stripeCustomerId}`
                  : "Assine um plano pago para criar sua conta de cobrança."}
              </p>
              {info.stripeSubscriptionStatus && (
                <p className="text-xs text-muted-foreground mt-1">
                  Assinatura Stripe: {info.stripeSubscriptionStatus}
                </p>
              )}
            </div>
            {hasStripe && (
              <Button
                variant="outline"
                className="gap-2"
                disabled={portalLoading}
                onClick={() => void handlePortal()}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gerenciar cobrança
              </Button>
            )}
          </div>

          {!hasSubscription && info.precoMensal <= 0 && upgradePlanos.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Você está no plano gratuito. Escolha um plano pago abaixo para ativar a cobrança
              recorrente.
            </p>
          )}

          {planosLoading && <Skeleton className="h-24 w-full rounded-lg" />}

          {!planosLoading && upgradePlanos.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {hasSubscription ? "Alterar plano" : "Assinar plano pago"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upgradePlanos.map((plano) => (
                  <div
                    key={plano.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{plano.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBRL(plano.preco_mensal)}/mês
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 gap-1"
                      disabled={checkoutPlanoId === plano.id}
                      onClick={() => void handleCheckout(plano.id)}
                    >
                      {checkoutPlanoId === plano.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                      {hasSubscription ? "Mudar" : "Assinar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasStripe && (
            <p className="text-xs text-muted-foreground">
              No portal Stripe você pode atualizar cartão, pausar assinatura, cancelar ou ver
              faturas. Alterações são refletidas automaticamente na plataforma.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
