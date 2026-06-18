import Stripe from "npm:stripe@17.7.0";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY não configurada nos secrets da função");
    }
    stripeClient = new Stripe(key, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeClient;
}

export function getSiteUrl(): string {
  return (
    Deno.env.get("SITE_URL") ??
    Deno.env.get("VITE_PUBLIC_URL") ??
    "http://localhost:3000"
  );
}

export function isRealStripePriceId(priceId: string | null | undefined): boolean {
  return Boolean(priceId && priceId.startsWith("price_") && !priceId.includes("placeholder"));
}

export interface EmpresaStatusFromStripe {
  status: string;
  is_active: boolean;
}

export function mapStripeStatusToEmpresa(
  stripeStatus: string,
): EmpresaStatusFromStripe {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return { status: "ativa", is_active: true };
    case "past_due":
    case "unpaid":
    case "paused":
      return { status: "suspensa", is_active: false };
    case "canceled":
    case "incomplete_expired":
      return { status: "cancelada", is_active: false };
    default:
      return { status: "suspensa", is_active: false };
  }
}

export async function findPlanoIdByStripePrice(
  adminClient: ReturnType<typeof import("jsr:@supabase/supabase-js@2").createClient>,
  priceId: string,
): Promise<number | null> {
  const { data } = await adminClient
    .from("planos")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.id ? Number(data.id) : null;
}

export async function findFreePlanoId(
  adminClient: ReturnType<typeof import("jsr:@supabase/supabase-js@2").createClient>,
): Promise<number | null> {
  const { data } = await adminClient
    .from("planos")
    .select("id")
    .eq("nome", "Free")
    .maybeSingle();
  return data?.id ? Number(data.id) : null;
}

export async function isMasterPlanoId(
  adminClient: ReturnType<typeof import("jsr:@supabase/supabase-js@2").createClient>,
  planoId: number | null | undefined,
): Promise<boolean> {
  if (!planoId) return false;
  const { data } = await adminClient
    .from("planos")
    .select("nome")
    .eq("id", planoId)
    .maybeSingle();
  return data?.nome === "Master";
}
