import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { GerenciarAssinaturaContent } from "@/components/billing/gerenciar-assinatura-content";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { useSession } from "@/features/auth/session-context";
import { toast } from "sonner";

export default function Assinatura() {
  const { canManageTenant } = useSession();
  const { info, isLoading, refresh } = useTenantSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Pagamento confirmado! Sua assinatura será atualizada em instantes.");
      void refresh();
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    } else if (checkout === "cancel") {
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
          Consulte seu plano atual, recursos disponíveis e opções de upgrade.
        </p>
      </div>

      <GerenciarAssinaturaContent
        info={info}
        isLoading={isLoading}
        canManageBilling={canManageTenant}
        onRefresh={refresh}
      />
    </div>
  );
}
