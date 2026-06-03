import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteBody {
  user_id?: string;
  motivo?: string;
  notify_by_email?: boolean;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendRemovalEmail(params: {
  toEmail: string;
  toName: string;
  empresaNome: string;
  motivo?: string;
  removedByName?: string;
}): Promise<{ sent: boolean; warning?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "ControlIA";

  if (!apiKey || !senderEmail) {
    return {
      sent: false,
      warning:
        "E-mail não enviado: configure BREVO_API_KEY e BREVO_SENDER_EMAIL nos secrets da função.",
    };
  }

  const motivoBlock = params.motivo?.trim()
    ? `<p><strong>Motivo informado:</strong></p><p>${escapeHtml(params.motivo.trim())}</p>`
    : "<p>Nenhum motivo adicional foi informado.</p>";

  const htmlContent = `
    <p>Olá ${escapeHtml(params.toName)},</p>
    <p>Seu acesso à plataforma ControlIA na empresa <strong>${escapeHtml(params.empresaNome)}</strong> foi removido.</p>
    ${motivoBlock}
    <p>Se acredita que isso foi um engano, entre em contato com o administrador da sua empresa.</p>
    <p style="color:#6b7280;font-size:12px;">ControlIA.io</p>
  `;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.toEmail, name: params.toName }],
      subject: "Seu acesso ao ControlIA foi removido",
      htmlContent,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      sent: false,
      warning: `Falha ao enviar e-mail: ${errText.slice(0, 200)}`,
    };
  }

  return { sent: true };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
      const emailResult = await sendRemovalEmail({
        toEmail: targetPerfil.email,
        toName: targetPerfil.nome_completo?.trim() || targetPerfil.email,
        empresaNome,
        motivo: motivo || undefined,
        removedByName: callerPerfil.nome_completo?.trim() || callerPerfil.email,
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
