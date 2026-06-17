import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getSiteUrl,
  getStripe,
  isRealStripePriceId,
  mapStripeStatusToEmpresa,
} from "../_shared/stripe.ts";

interface CheckoutBody {
  plano_id?: number;
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
      .select("id, empresa_id, role")
      .eq("id", user.id)
      .single();
    if (callerError || !callerPerfil) {
      return jsonResponse({ error: "Perfil não encontrado" }, 403);
    }
    if (callerPerfil.role !== "admin" && callerPerfil.role !== "master") {
      return jsonResponse({ error: "Apenas administradores podem assinar planos" }, 403);
    }

    const body = (await req.json()) as CheckoutBody;
    const planoId = Number(body.plano_id);
    if (!planoId || Number.isNaN(planoId)) {
      return jsonResponse({ error: "plano_id é obrigatório" }, 400);
    }

    const empresaId = callerPerfil.empresa_id as number;
    const [{ data: empresa, error: empresaError }, { data: plano, error: planoError }] =
      await Promise.all([
        adminClient.from("empresas").select("*").eq("id", empresaId).single(),
        adminClient.from("planos").select("*").eq("id", planoId).single(),
      ]);

    if (empresaError || !empresa) {
      return jsonResponse({ error: "Empresa não encontrada" }, 404);
    }
    if (planoError || !plano) {
      return jsonResponse({ error: "Plano não encontrado" }, 404);
    }
    if (!plano.is_active) {
      return jsonResponse({ error: "Plano indisponível" }, 400);
    }
    if (Number(plano.preco_mensal) <= 0) {
      return jsonResponse({ error: "Este plano é gratuito e não requer checkout" }, 400);
    }
    if (!isRealStripePriceId(plano.stripe_price_id as string)) {
      return jsonResponse(
        {
          error:
            "Plano ainda não sincronizado com o Stripe. Peça ao Master para sincronizar o plano.",
          code: "stripe_not_synced",
        },
        400,
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();
    const priceId = plano.stripe_price_id as string;
    const metadata = {
      empresa_id: String(empresaId),
      plano_id: String(planoId),
      user_id: user.id,
    };

    if (empresa.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(
        empresa.stripe_subscription_id as string,
      );
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) {
        return jsonResponse({ error: "Assinatura Stripe inválida" }, 400);
      }

      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata,
      });

      const mapped = mapStripeStatusToEmpresa(updated.status);
      await adminClient
        .from("empresas")
        .update({
          plano_id: planoId,
          stripe_subscription_status: updated.status,
          status: mapped.status,
          is_active: mapped.is_active,
          proxima_cobranca: new Date(updated.current_period_end * 1000).toISOString(),
        })
        .eq("id", empresaId);

      return jsonResponse({
        success: true,
        upgraded: true,
        message: "Plano atualizado com sucesso.",
      });
    }

    const sessionParams: Record<string, unknown> = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/assinatura?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/assinatura?checkout=cancel`,
      client_reference_id: String(empresaId),
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: true,
    };

    if (empresa.stripe_customer_id) {
      sessionParams.customer = empresa.stripe_customer_id;
    } else {
      sessionParams.customer_email =
        (empresa.email as string | null) ?? user.email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0],
    );

    if (!session.url) {
      return jsonResponse({ error: "Não foi possível criar sessão de checkout" }, 500);
    }

    return jsonResponse({ success: true, url: session.url });
  } catch (err) {
    console.error("[create-checkout-session]", err);
    const message = err instanceof Error ? err.message : "Erro ao criar checkout";
    return jsonResponse({ error: message }, 500);
  }
});
