import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { userRemovalEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface DeleteBody {
  user_id?: string;
  motivo?: string;
  notify_by_email?: boolean;
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
      .select("id, empresa_id, role, nome_completo, email")
      .eq("id", user.id)
      .single();

    if (callerError || !callerPerfil) {
      return jsonResponse({ error: "Perfil do solicitante não encontrado" }, 403);
    }

    if (callerPerfil.role !== "admin" && callerPerfil.role !== "master") {
      return jsonResponse({ error: "Sem permissão para excluir usuários" }, 403);
    }

    const body = (await req.json()) as DeleteBody;
    const targetUserId = body.user_id?.trim() ?? "";

    if (!targetUserId) {
      return jsonResponse({ error: "user_id é obrigatório" }, 400);
    }

    if (targetUserId === callerPerfil.id) {
      return jsonResponse({ error: "Você não pode excluir sua própria conta" }, 400);
    }

    const { data: targetPerfil, error: targetError } = await adminClient
      .from("perfis")
      .select("id, empresa_id, role, email, nome_completo")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetPerfil) {
      return jsonResponse({ error: "Usuário não encontrado" }, 404);
    }

    if (targetPerfil.empresa_id !== callerPerfil.empresa_id) {
      return jsonResponse({ error: "Usuário pertence a outro tenant" }, 403);
    }

    if (targetPerfil.role === "master") {
      return jsonResponse({ error: "Não é permitido excluir usuário master" }, 403);
    }

    if (callerPerfil.role === "admin" && targetPerfil.role !== "user") {
      return jsonResponse(
        { error: "Admin só pode excluir colaboradores (user)" },
        403,
      );
    }

    const motivo = body.motivo?.trim() ?? "";
    const notifyByEmail = Boolean(body.notify_by_email);

    const { data: empresa } = await adminClient
      .from("empresas")
      .select("nome")
      .eq("id", targetPerfil.empresa_id)
      .single();

    const empresaNome = (empresa?.nome as string | undefined) ?? "sua empresa";

    let emailSent = false;
    let emailWarning: string | undefined;

    if (notifyByEmail) {
      const template = userRemovalEmail({
        nome: targetPerfil.nome_completo?.trim() || targetPerfil.email,
        empresaNome,
        motivo: motivo || undefined,
      });
      const emailResult = await sendBrevoEmail({
        toEmail: targetPerfil.email,
        toName: targetPerfil.nome_completo?.trim() || targetPerfil.email,
        subject: template.subject,
        htmlContent: template.html,
      });
      emailSent = emailResult.sent;
      emailWarning = emailResult.warning;
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      targetUserId,
    );

    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    return jsonResponse({
      success: true,
      message: "Usuário excluído com sucesso.",
      email_sent: emailSent,
      email_warning: emailWarning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("delete-tenant-user error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
