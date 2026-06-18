import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getStripe } from "../_shared/stripe.ts";
import { applyStripeSubscription } from "../_shared/subscription-sync.ts";

interface SyncBody {
  session_id?: string;
  stripe_session?: string;
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

    const body = (await req.json()) as SyncBody;
    const sessionId = (body.stripe_session ?? body.session_id)?.trim();
    if (!sessionId) {
      return jsonResponse({ error: "session_id é obrigatório" }, 400);
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
      return jsonResponse({ error: "Apenas administradores podem sincronizar checkout" }, 403);
    }

    const empresaId = callerPerfil.empresa_id as number;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const sessionEmpresaId = session.metadata?.empresa_id
      ? Number(session.metadata.empresa_id)
      : session.client_reference_id
        ? Number(session.client_reference_id)
        : null;

    if (sessionEmpresaId !== empresaId) {
      return jsonResponse({ error: "Sessão de checkout não pertence a esta empresa" }, 403);
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return jsonResponse(
        {
          error: "Pagamento ainda não confirmado. Aguarde alguns instantes e atualize a página.",
          code: "payment_pending",
        },
        409,
      );
    }

    const subscriptionRef = session.subscription;
    if (!subscriptionRef) {
      return jsonResponse({ error: "Assinatura não encontrada na sessão" }, 400);
    }

    const subscription =
      typeof subscriptionRef === "string"
        ? await stripe.subscriptions.retrieve(subscriptionRef)
        : subscriptionRef;

    const planoId = await applyStripeSubscription(
      adminClient,
      subscription,
      empresaId,
    );

    const { data: empresa } = await adminClient
      .from("empresas")
      .select("plano_id, proxima_cobranca, stripe_subscription_status")
      .eq("id", empresaId)
      .single();

    const resolvedPlanoId = planoId ?? (empresa?.plano_id as number);
    const { data: plano } = await adminClient
      .from("planos")
      .select("nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes")
      .eq("id", resolvedPlanoId)
      .single();

    return jsonResponse({
      success: true,
      message: `Assinatura ativada no plano ${plano?.nome ?? "atualizado"}.`,
      plano: plano
        ? {
            id: resolvedPlanoId,
            nome: plano.nome,
            preco_mensal: Number(plano.preco_mensal ?? 0),
            max_usuarios: Number(plano.max_usuarios ?? 0),
            max_agentes: Number(plano.max_agentes ?? 0),
            limite_mensagens_mes: Number(plano.limite_mensagens_mes ?? 0),
          }
        : null,
      proxima_cobranca: empresa?.proxima_cobranca ?? null,
      stripe_subscription_status: empresa?.stripe_subscription_status ?? subscription.status,
    });
  } catch (err) {
    console.error("[sync-checkout-session]", err);
    const message = err instanceof Error ? err.message : "Erro ao sincronizar checkout";
    return jsonResponse({ error: message }, 500);
  }
});
