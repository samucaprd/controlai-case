import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { inviteAcceptedEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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

    if (userError || !user?.email) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: perfil, error: perfilError } = await adminClient
      .from("perfis")
      .select("nome_completo, empresa_id")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      return jsonResponse({ error: "Perfil não encontrado" }, 404);
    }

    const { data: empresa } = await adminClient
      .from("empresas")
      .select("nome")
      .eq("id", perfil.empresa_id)
      .single();

    const nome = perfil.nome_completo?.trim() || user.email.split("@")[0];
    const empresaNome = (empresa?.nome as string | undefined) ?? "sua empresa";

    const template = inviteAcceptedEmail({ nome, empresaNome });
    const emailResult = await sendBrevoEmail({
      toEmail: user.email,
      toName: nome,
      subject: template.subject,
      htmlContent: template.html,
    });

    return jsonResponse({
      success: true,
      email_sent: emailResult.sent,
      email_warning: emailResult.warning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("notify-invite-accepted error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
