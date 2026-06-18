import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSiteUrl, getStripe, isMasterPlanoId } from "../_shared/stripe.ts";

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
      return jsonResponse({ error: "Apenas administradores podem acessar o portal" }, 403);
    }

    const empresaId = callerPerfil.empresa_id as number;
    const { data: empresa, error: empresaError } = await adminClient
      .from("empresas")
      .select("stripe_customer_id, stripe_subscription_id, plano_id")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      return jsonResponse({ error: "Empresa não encontrada" }, 404);
    }

    if (await isMasterPlanoId(adminClient, empresa.plano_id as number)) {
      return jsonResponse(
        {
          error: "Tenants no plano Master não utilizam o portal de cobrança.",
          code: "master_plan_locked",
        },
        403,
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();

    let customerId = empresa.stripe_customer_id as string | null;
    if (!customerId && empresa.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(
        empresa.stripe_subscription_id as string,
      );
      customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await adminClient
        .from("empresas")
        .update({ stripe_customer_id: customerId })
        .eq("id", empresaId);
    }

    if (!customerId) {
      return jsonResponse(
        {
          error: "Nenhuma conta Stripe vinculada. Assine um plano pago primeiro.",
          code: "no_stripe_customer",
        },
        400,
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/dashboard/assinatura`,
    });

    return jsonResponse({ success: true, url: session.url });
  } catch (err) {
    console.error("[create-portal-session]", err);
    const message = err instanceof Error ? err.message : "Erro ao abrir portal";
    return jsonResponse({ error: message }, 500);
  }
});
