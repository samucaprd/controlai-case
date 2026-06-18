import { useSearchParams } from "react-router-dom";
import { CheckoutSuccessBanner } from "@/components/billing/checkout-success-banner";
import { GerenciarAssinaturaContent } from "@/components/billing/gerenciar-assinatura-content";
import { useCheckoutReturn } from "@/features/billing/use-checkout-return";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { useSession } from "@/features/auth/session-context";

export default function Assinatura() {
  const { canManageTenant } = useSession();
  const { info, isLoading, refresh } = useTenantSubscription();
  const { checkoutSuccess, syncingCheckout, dismissSuccess } = useCheckoutReturn(refresh);
  const [searchParams] = useSearchParams();
  const isCheckoutPending =
    searchParams.get("checkout") === "success" || syncingCheckout;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar assinatura</h1>
        <p className="text-muted-foreground mt-2">
          Consulte seu plano atual, recursos disponíveis, upgrades e opções de cancelamento.
        </p>
      </div>

      {isCheckoutPending && (
        <p className="text-sm text-muted-foreground">Confirmando pagamento e atualizando plano…</p>
      )}

      {checkoutSuccess?.plano && (
        <CheckoutSuccessBanner result={checkoutSuccess} onDismiss={dismissSuccess} />
      )}

      <GerenciarAssinaturaContent
        info={info}
        isLoading={isLoading || syncingCheckout}
        canManageBilling={canManageTenant}
        onRefresh={refresh}
      />
    </div>
  );
}
