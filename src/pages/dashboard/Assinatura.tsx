import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckoutSuccessBanner } from "@/components/billing/checkout-success-banner";
import { GerenciarAssinaturaContent } from "@/components/billing/gerenciar-assinatura-content";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { useSession } from "@/features/auth/session-context";
import {
  syncCheckoutSession,
  type SyncCheckoutResult,
  StripeApiError,
} from "@/lib/api/stripe";
import { toast } from "sonner";

export default function Assinatura() {
  const { canManageTenant } = useSession();
  const { info, isLoading, refresh } = useTenantSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutSuccess, setCheckoutSuccess] = useState<SyncCheckoutResult | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const handledCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout === "success" && sessionId) {
      if (handledCheckoutRef.current === sessionId) return;
      handledCheckoutRef.current = sessionId;

      const run = async () => {
        setSyncingCheckout(true);
        try {
          const result = await syncCheckoutSession(sessionId);
          setCheckoutSuccess(result);
          await refresh();
          toast.success(result.message ?? "Assinatura atualizada com sucesso!");
        } catch (err) {
          const message =
            err instanceof StripeApiError
              ? err.message
              : "Não foi possível confirmar o pagamento. Atualizando dados…";
          toast.error(message);
          await refresh();
        } finally {
          setSyncingCheckout(false);
          const next = new URLSearchParams(searchParams);
          next.delete("checkout");
          next.delete("session_id");
          setSearchParams(next, { replace: true });
        }
      };

      void run();
      return;
    }

    if (checkout === "cancel") {
      toast.message("Checkout cancelado.");
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, refresh, setSearchParams]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar assinatura</h1>
        <p className="text-muted-foreground mt-2">
          Consulte seu plano atual, recursos disponíveis, upgrades e opções de cancelamento.
        </p>
      </div>

      {syncingCheckout && (
        <p className="text-sm text-muted-foreground">Confirmando pagamento e atualizando plano…</p>
      )}

      {checkoutSuccess?.plano && (
        <CheckoutSuccessBanner
          result={checkoutSuccess}
          onDismiss={() => setCheckoutSuccess(null)}
        />
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
