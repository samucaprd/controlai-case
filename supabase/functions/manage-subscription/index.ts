import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  findFreePlanoId,
  getStripe,
  isMasterPlanoId,
  mapStripeStatusToEmpresa,
} from "../_shared/stripe.ts";

type ManageAction = "cancel" | "reactivate" | "downgrade_free";

interface ManageBody {
  action?: ManageAction;
}

async function assertAdminBilling(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data: callerPerfil, error: callerError } = await adminClient
    .from("perfis")
    .select("id, empresa_id, role")
    .eq("id", userId)
    .single();

  if (callerError || !callerPerfil) {
    return { error: jsonResponse({ error: "Perfil não encontrado" }, 403) };
  }
  if (callerPerfil.role !== "admin" && callerPerfil.role !== "master") {
    return {
      error: jsonResponse(
        { error: "Apenas administradores podem gerenciar a assinatura" },
        403,
      ),
    };
  }

  const empresaId = callerPerfil.empresa_id as number;
  const { data: empresa, error: empresaError } = await adminClient
    .from("empresas")
    .select("*")
    .eq("id", empresaId)
    .single();

  if (empresaError || !empresa) {
    return { error: jsonResponse({ error: "Empresa não encontrada" }, 404) };
  }

  return { callerPerfil, empresa, empresaId };
}

function cancelAtFromSubscription(subscription: {
  cancel_at_period_end: boolean;
  current_period_end: number;
}): string | null {
  if (!subscription.cancel_at_period_end) return null;
  return new Date(subscription.current_period_end * 1000).toISOString();
}

async function applyDowngradeToFree(
  adminClient: ReturnType<typeof createClient>,
  empresaId: number,
): Promise<void> {
  const freePlanoId = await findFreePlanoId(adminClient);
  const { error } = await adminClient
    .from("empresas")
    .update({
      stripe_subscription_id: null,
      stripe_subscription_status: "canceled",
      subscription_cancel_at: null,
      status: "ativa",
      is_active: true,
      proxima_cobranca: null,
      ...(freePlanoId ? { plano_id: freePlanoId } : {}),
    })
    .eq("id", empresaId);

  if (error) throw error;
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
    const authResult = await assertAdminBilling(adminClient, user.id);
    if (authResult.error) return authResult.error;

    const { empresa, empresaId } = authResult;
    const body = (await req.json()) as ManageBody;
    const action = body.action;

    if (await isMasterPlanoId(adminClient, empresa.plano_id as number)) {
      return jsonResponse(
        {
          error: "Tenants no plano Master não podem alterar ou cancelar assinatura por aqui.",
          code: "master_plan_locked",
        },
        403,
      );
    }

    if (!action || !["cancel", "reactivate", "downgrade_free"].includes(action)) {
      return jsonResponse({ error: "action inválida" }, 400);
    }

    const subscriptionId = empresa.stripe_subscription_id as string | null;
    if (!subscriptionId && action !== "downgrade_free") {
      return jsonResponse(
        {
          error: "Nenhuma assinatura ativa encontrada.",
          code: "no_subscription",
        },
        400,
      );
    }

    const stripe = getStripe();

    if (action === "downgrade_free") {
      if (!subscriptionId) {
        const freePlanoId = await findFreePlanoId(adminClient);
        if (freePlanoId && empresa.plano_id === freePlanoId) {
          return jsonResponse({
            success: true,
            message: "Você já está no plano Free.",
          });
        }
        await applyDowngradeToFree(adminClient, empresaId);
        return jsonResponse({
          success: true,
          downgraded: true,
          message: "Plano alterado para Free.",
        });
      }

      await stripe.subscriptions.cancel(subscriptionId);
      await applyDowngradeToFree(adminClient, empresaId);

      return jsonResponse({
        success: true,
        downgraded: true,
        message: "Assinatura cancelada. Você está no plano Free.",
      });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId!);

    if (action === "cancel") {
      if (subscription.cancel_at_period_end) {
        const cancelAt = cancelAtFromSubscription(subscription);
        return jsonResponse({
          success: true,
          message: "O cancelamento já estava agendado.",
          cancel_at: cancelAt,
        });
      }

      const updated = await stripe.subscriptions.update(subscriptionId!, {
        cancel_at_period_end: true,
      });

      const cancelAt = cancelAtFromSubscription(updated);
      const mapped = mapStripeStatusToEmpresa(updated.status);

      await adminClient
        .from("empresas")
        .update({
          stripe_subscription_status: updated.status,
          subscription_cancel_at: cancelAt,
          status: mapped.status,
          is_active: mapped.is_active,
          proxima_cobranca: new Date(updated.current_period_end * 1000).toISOString(),
        })
        .eq("id", empresaId);

      return jsonResponse({
        success: true,
        message:
          "Cancelamento agendado. Você mantém o acesso até o fim do período pago e depois volta ao plano Free.",
        cancel_at: cancelAt,
      });
    }

    if (action === "reactivate") {
      if (!subscription.cancel_at_period_end) {
        return jsonResponse({
          success: true,
          message: "A assinatura já está ativa sem cancelamento pendente.",
        });
      }

      const updated = await stripe.subscriptions.update(subscriptionId!, {
        cancel_at_period_end: false,
      });

      const mapped = mapStripeStatusToEmpresa(updated.status);

      await adminClient
        .from("empresas")
        .update({
          stripe_subscription_status: updated.status,
          subscription_cancel_at: null,
          status: mapped.status,
          is_active: mapped.is_active,
          proxima_cobranca: new Date(updated.current_period_end * 1000).toISOString(),
        })
        .eq("id", empresaId);

      return jsonResponse({
        success: true,
        message: "Assinatura reativada com sucesso.",
      });
    }

    return jsonResponse({ error: "Ação não suportada" }, 400);
  } catch (err) {
    console.error("[manage-subscription]", err);
    const message = err instanceof Error ? err.message : "Erro ao gerenciar assinatura";
    return jsonResponse({ error: message }, 500);
  }
});
