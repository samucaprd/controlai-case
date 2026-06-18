import { getSupabase } from "@/lib/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface StripeCheckoutResult {
  success: boolean;
  url?: string;
  upgraded?: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export interface StripePortalResult {
  success: boolean;
  url?: string;
  error?: string;
  code?: string;
}

export type ManageSubscriptionAction = "cancel" | "reactivate" | "downgrade_free";

export interface ManageSubscriptionResult {
  success: boolean;
  message?: string;
  cancel_at?: string | null;
  downgraded?: boolean;
  error?: string;
  code?: string;
}

export interface SyncStripePlanInput {
  plano_id?: number;
  nome: string;
  preco_mensal: number;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  is_active: boolean;
}

export interface SyncStripePlanResult {
  success: boolean;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  message?: string;
  error?: string;
}

export class StripeApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "StripeApiError";
    this.code = code;
  }
}

async function parseFunctionError(
  error: FunctionsHttpError,
): Promise<{ message: string; code?: string }> {
  try {
    const body = await error.context.json();
    if (body && typeof body === "object" && "error" in body) {
      const err = body as { error?: string; code?: string };
      return { message: err.error ?? error.message, code: err.code };
    }
  } catch {
    // ignore
  }
  return { message: error.message };
}

async function invokeStripeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = await parseFunctionError(error);
      throw new StripeApiError(parsed.message, parsed.code);
    }
    throw new StripeApiError(error.message || `Erro ao chamar ${name}`);
  }

  const payload = data as T & { error?: string; code?: string };
  if (payload?.error) {
    throw new StripeApiError(payload.error, payload.code);
  }
  return payload;
}

export interface SyncCheckoutResult {
  success: boolean;
  message?: string;
  plano?: {
    id: number;
    nome: string;
    preco_mensal: number;
    max_usuarios: number;
    max_agentes: number;
    limite_mensagens_mes: number;
  };
  proxima_cobranca?: string | null;
  stripe_subscription_status?: string | null;
  error?: string;
  code?: string;
}

export async function syncCheckoutSession(
  sessionId: string,
): Promise<SyncCheckoutResult> {
  return invokeStripeFunction<SyncCheckoutResult>("sync-checkout-session", {
    session_id: sessionId,
    stripe_session: sessionId,
  });
}

export async function createCheckoutSession(
  planoId: number,
): Promise<StripeCheckoutResult> {
  return invokeStripeFunction<StripeCheckoutResult>("create-checkout-session", {
    plano_id: planoId,
  });
}

export async function createPortalSession(): Promise<StripePortalResult> {
  return invokeStripeFunction<StripePortalResult>("create-portal-session", {});
}

export async function manageSubscription(
  action: ManageSubscriptionAction,
): Promise<ManageSubscriptionResult> {
  return invokeStripeFunction<ManageSubscriptionResult>("manage-subscription", {
    action,
  });
}

export async function syncStripePlan(
  input: SyncStripePlanInput,
): Promise<SyncStripePlanResult> {
  return invokeStripeFunction<SyncStripePlanResult>("manage-stripe-plan", input);
}

export async function archiveStripePlan(planoId: number): Promise<void> {
  await invokeStripeFunction<{ success: boolean }>("manage-stripe-plan", {
    plano_id: planoId,
    archive: true,
  });
}

export function isStripeSynced(priceId: string | null | undefined): boolean {
  return Boolean(
    priceId && priceId.startsWith("price_") && !priceId.includes("placeholder"),
  );
}

export function redirectToStripe(url: string): void {
  window.location.href = url;
}
