import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  findPlanoIdByStripePrice,
  mapStripeStatusToEmpresa,
} from "./stripe.ts";

export interface StripeSubscriptionPayload {
  id: string;
  customer: string | { id: string };
  status: string;
  current_period_end: number;
  cancel_at_period_end?: boolean;
  items: { data: Array<{ price?: { id?: string } | null }> };
  metadata?: Record<string, string>;
}

export async function applyStripeSubscription(
  adminClient: ReturnType<typeof createClient>,
  subscription: StripeSubscriptionPayload,
  empresaIdHint?: number | null,
): Promise<number | null> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const mapped = mapStripeStatusToEmpresa(subscription.status);

  let planoId = priceId
    ? await findPlanoIdByStripePrice(adminClient, priceId)
    : null;

  const metadataPlanoId = subscription.metadata?.plano_id
    ? Number(subscription.metadata.plano_id)
    : null;
  if (!planoId && metadataPlanoId) planoId = metadataPlanoId;

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    status: mapped.status,
    is_active: mapped.is_active,
    proxima_cobranca: new Date(subscription.current_period_end * 1000).toISOString(),
    subscription_cancel_at:
      subscription.cancel_at_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
  };
  if (planoId) update.plano_id = planoId;

  let query = adminClient.from("empresas").update(update);

  if (empresaIdHint) {
    query = query.eq("id", empresaIdHint);
  } else {
    query = query.eq("stripe_customer_id", customerId);
  }

  const { error } = await query;
  if (error) throw error;

  return planoId;
}
