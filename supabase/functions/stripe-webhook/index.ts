import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  findFreePlanoId,
  getStripe,
} from "../_shared/stripe.ts";
import { applyStripeSubscription } from "../_shared/subscription-sync.ts";

async function isEventProcessed(
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
): Promise<boolean> {
  const { data } = await adminClient
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  return Boolean(data);
}

async function markEventProcessed(
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
  type: string,
): Promise<void> {
  await adminClient.from("stripe_webhook_events").insert({ id: eventId, type });
}

async function applySubscription(
  adminClient: ReturnType<typeof createClient>,
  subscription: Parameters<typeof applyStripeSubscription>[1],
  empresaIdHint?: number | null,
): Promise<void> {
  await applyStripeSubscription(adminClient, subscription, empresaIdHint);
}

async function downgradeToFree(
  adminClient: ReturnType<typeof createClient>,
  customerId: string,
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
    .eq("stripe_customer_id", customerId);
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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return jsonResponse({ error: "STRIPE_WEBHOOK_SECRET não configurada" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    const stripe = getStripe();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return jsonResponse({ error: "Assinatura Stripe ausente" }, 400);
    }

    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (await isEventProcessed(adminClient, event.id)) {
      return jsonResponse({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string>;
        };
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          const empresaId = session.metadata?.empresa_id
            ? Number(session.metadata.empresa_id)
            : null;
          await applySubscription(adminClient, subscription, empresaId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Parameters<
          typeof applySubscription
        >[1];
        await applySubscription(adminClient, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as {
          customer: string | { id: string };
        };
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await downgradeToFree(adminClient, customerId);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as {
          customer?: string | null;
          subscription?: string | null;
        };
        if (invoice.subscription && invoice.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
          );
          await applySubscription(adminClient, subscription);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as { customer?: string | null };
        if (invoice.customer) {
          await adminClient
            .from("empresas")
            .update({ status: "suspensa", is_active: false })
            .eq("stripe_customer_id", invoice.customer);
        }
        break;
      }
      default:
        break;
    }

    await markEventProcessed(adminClient, event.id, event.type);
    return jsonResponse({ received: true });
  } catch (err) {
    console.error("[stripe-webhook]", err);
    const message = err instanceof Error ? err.message : "Erro no webhook";
    return jsonResponse({ error: message }, 400);
  }
});
