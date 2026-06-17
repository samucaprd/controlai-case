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
import { usePublicPlanos, type PublicPlano } from "@/features/billing/use-public-planos";
import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";
import {
  createCheckoutSession,
  createPortalSession,
  isStripeSynced,
  redirectToStripe,
  StripeApiError,
} from "@/lib/api/stripe";
import { toast } from "sonner";

interface GerenciarAssinaturaContentProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
  canManageBilling: boolean;
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

function planResourceLines(plano: PublicPlano): string[] {
  if (plano.features.length > 0) return plano.features;
  return [
    plano.max_usuarios >= 9999
      ? "Usuários ilimitados"
      : `Até ${plano.max_usuarios} usuários`,
    `Até ${plano.max_agentes} agentes IA`,
    `${plano.limite_mensagens_mes.toLocaleString("pt-BR")} mensagens/mês`,
    "Traga sua própria API (BYOK)",
  ];
}

function currentPlanResourceLines(info: TenantSubscriptionInfo): string[] {
  if (info.features.length > 0) return info.features;
  return [
    info.maxUsuarios >= 9999
      ? "Usuários ilimitados"
      : `Até ${info.maxUsuarios} usuários`,
    `Até ${info.maxAgentes} agentes IA`,
    `${info.limiteMensagens.toLocaleString("pt-BR")} mensagens/mês`,
    "Traga sua própria API (BYOK)",
  ];
}

function PlanoUpgradeCard({
  plano,
  isCurrent,
  isUpgrade,
  canManageBilling,
  hasSubscription,
  checkoutPlanoId,
  onCheckout,
}: {
  plano: PublicPlano;
  isCurrent: boolean;
  isUpgrade: boolean;
  canManageBilling: boolean;
  hasSubscription: boolean;
  checkoutPlanoId: number | null;
  onCheckout: (id: number) => void;
}) {
  const features = planResourceLines(plano);
  const canCheckout =
    canManageBilling &&
    !isCurrent &&
    plano.preco_mensal > 0 &&
    isStripeSynced(plano.stripe_price_id);

  return (
    <Card
      className={`border-border flex flex-col ${
        isCurrent ? "border-primary/60 ring-1 ring-primary/20" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: plano.cor ?? "#6B7280" }}
            />
            <CardTitle className="text-lg truncate">{plano.nome}</CardTitle>
          </div>
          {isCurrent && (
            <Badge variant="secondary" className="shrink-0 font-normal">
              Atual
            </Badge>
          )}
          {!isCurrent && isUpgrade && (
            <Badge className="shrink-0 font-normal bg-primary/15 text-primary hover:bg-primary/15">
              Upgrade
            </Badge>
          )}
        </div>
        <CardDescription>
          {plano.nome === "Master" && plano.preco_mensal <= 0
            ? "Sob consulta"
            : formatPlanoPreco(plano.preco_mensal)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 pt-0">
        <ul className="space-y-2 flex-1">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>
        {canCheckout && (
          <Button
            size="sm"
            className="w-full gap-1"
            disabled={checkoutPlanoId === plano.id}
            onClick={() => onCheckout(plano.id)}
          >
            {checkoutPlanoId === plano.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            {hasSubscription ? "Mudar para este plano" : "Assinar"}
          </Button>
        )}
        {!isCurrent && !canManageBilling && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Peça ao administrador da empresa para alterar o plano.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function GerenciarAssinaturaContent({
  info,
  isLoading,
  canManageBilling,
  onRefresh,
}: GerenciarAssinaturaContentProps) {
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
        <Skeleton className="h-64 w-full rounded-xl" />
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
  const currentResources = currentPlanResourceLines(info);
  const sortedPlanos = [...availablePlanos].sort(
    (a, b) => a.preco_mensal - b.preco_mensal,
  );

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Sua assinatura atual
              </CardTitle>
              <CardDescription className="mt-1">
                Plano e recursos disponíveis para {info.empresaNome}
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
              <p className="text-xs text-muted-foreground">Mensagens/mês</p>
              <p className="font-medium mt-1">
                {info.limiteMensagens.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recursos do seu plano
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {currentResources.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {canManageBilling && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Pagamentos (Stripe)</CardTitle>
            <CardDescription>
              Atualize cartão, pause, cancele ou veja faturas no portal Stripe.
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
                    Status Stripe: {info.stripeSubscriptionStatus}
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
                  Portal de cobrança
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Compare os planos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Veja o que cada plano oferece e os recursos extras nos upgrades.
          </p>
        </div>

        {planosLoading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        )}

        {!planosLoading && sortedPlanos.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedPlanos.map((plano) => (
              <PlanoUpgradeCard
                key={plano.id}
                plano={plano}
                isCurrent={plano.id === info.planoId}
                isUpgrade={plano.preco_mensal > info.precoMensal}
                canManageBilling={canManageBilling}
                hasSubscription={hasSubscription}
                checkoutPlanoId={checkoutPlanoId}
                onCheckout={(id) => void handleCheckout(id)}
              />
            ))}
          </div>
        )}

        {!canManageBilling && (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
            Alterações de plano e cobrança são feitas pelo administrador da empresa. Você
            pode visualizar aqui os recursos do plano atual e o que ganha em cada upgrade.
          </p>
        )}
      </div>
    </div>
  );
}
