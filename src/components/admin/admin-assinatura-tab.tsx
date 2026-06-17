import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";
import { GerenciarAssinaturaContent } from "@/components/billing/gerenciar-assinatura-content";

interface AdminAssinaturaTabProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
}

export function AdminAssinaturaTab({
  info,
  isLoading,
  onRefresh,
}: AdminAssinaturaTabProps) {
  return (
    <GerenciarAssinaturaContent
      info={info}
      isLoading={isLoading}
      canManageBilling
      onRefresh={onRefresh}
    />
  );
}
