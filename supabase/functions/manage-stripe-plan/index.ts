import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getStripe, isRealStripePriceId } from "../_shared/stripe.ts";

interface ManageStripePlanBody {
  plano_id?: number;
  nome?: string;
  preco_mensal?: number;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  is_active?: boolean;
  archive?: boolean;
}

function toCents(precoMensal: number): number {
  return Math.round(precoMensal * 100);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerPerfil, error: callerError } = await adminClient
      .from("perfis")
      .select("role")
      .eq("id", user.id)
      .single();
    if (callerError || !callerPerfil || callerPerfil.role !== "master") {
      return jsonResponse({ error: "Apenas Master pode sincronizar planos com Stripe" }, 403);
    }

    const body = (await req.json()) as ManageStripePlanBody;
    const stripe = getStripe();

    if (body.archive && body.plano_id) {
      const { data: plano } = await adminClient
        .from("planos")
        .select("stripe_product_id, stripe_price_id")
        .eq("id", body.plano_id)
        .single();

      if (plano?.stripe_product_id) {
        await stripe.products.update(plano.stripe_product_id as string, { active: false });
      }
      if (isRealStripePriceId(plano?.stripe_price_id as string)) {
        await stripe.prices.update(plano!.stripe_price_id as string, { active: false });
      }

      return jsonResponse({ success: true, archived: true });
    }

    const nome = body.nome?.trim();
    const precoMensal = Number(body.preco_mensal ?? 0);
    const isActive = body.is_active !== false;
    let productId = body.stripe_product_id ?? null;
    let priceId = body.stripe_price_id ?? null;

    if (!nome) {
      return jsonResponse({ error: "nome é obrigatório" }, 400);
    }

    const productMetadata = body.plano_id
      ? { controlia_plano_id: String(body.plano_id) }
      : undefined;

    if (!productId) {
      const product = await stripe.products.create({
        name: `ControlIA — ${nome}`,
        active: isActive,
        metadata: productMetadata,
      });
      productId = product.id;
    } else {
      await stripe.products.update(productId, {
        name: `ControlIA — ${nome}`,
        active: isActive,
        metadata: productMetadata,
      });
    }

    const unitAmount = toCents(precoMensal);
    let needsNewPrice = true;
    if (isRealStripePriceId(priceId)) {
      const existing = await stripe.prices.retrieve(priceId!);
      if (
        existing.unit_amount === unitAmount &&
        existing.currency === "brl" &&
        existing.active
      ) {
        needsNewPrice = false;
      } else {
        await stripe.prices.update(priceId!, { active: false });
        priceId = null;
      }
    }

    if (needsNewPrice) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: "brl",
        recurring: { interval: "month" },
        active: isActive,
        metadata: productMetadata,
      });
      priceId = price.id;
    }

    if (body.plano_id) {
      await adminClient
        .from("planos")
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
        })
        .eq("id", body.plano_id);
    }

    return jsonResponse({
      success: true,
      stripe_product_id: productId,
      stripe_price_id: priceId,
      message:
        precoMensal <= 0
          ? "Plano gratuito sincronizado no Stripe (R$ 0/mês)."
          : undefined,
    });
  } catch (err) {
    console.error("[manage-stripe-plan]", err);
    const message = err instanceof Error ? err.message : "Erro ao sincronizar plano";
    return jsonResponse({ error: message }, 500);
  }
});
