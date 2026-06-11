import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail, getSiteUrl } from "../_shared/brevo.ts";
import { userInviteEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface InviteBody {
  email?: string;
  nome_completo?: string;
  role?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      .select("id, empresa_id, role, nome_completo")
      .eq("id", user.id)
      .single();

    if (callerError || !callerPerfil) {
      return jsonResponse({ error: "Perfil do solicitante não encontrado" }, 403);
    }

    if (callerPerfil.role !== "admin" && callerPerfil.role !== "master") {
      return jsonResponse(
        { error: "Apenas admin ou master podem convidar usuários" },
        403,
      );
    }

    const body = (await req.json()) as InviteBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const nomeCompleto = body.nome_completo?.trim() ?? "";
    const role = body.role === "admin" ? "admin" : "user";

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: "E-mail inválido" }, 400);
    }

    if (!nomeCompleto || nomeCompleto.length > 200) {
      return jsonResponse({ error: "Nome completo é obrigatório" }, 400);
    }

    const { data: existingPerfil } = await adminClient
      .from("perfis")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingPerfil) {
      return jsonResponse(
        {
          error: "Este e-mail já está cadastrado na plataforma.",
          code: "EMAIL_EXISTS",
        },
        409,
      );
    }

    const { data: empresa } = await adminClient
      .from("empresas")
      .select("nome, plano_id")
      .eq("id", callerPerfil.empresa_id)
      .single();

    const { data: plano } = await adminClient
      .from("planos")
      .select("max_usuarios")
      .eq("id", empresa?.plano_id as number)
      .single();

    const maxUsuarios = Number(plano?.max_usuarios ?? 0);
    const { count: userCount } = await adminClient
      .from("perfis")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", callerPerfil.empresa_id)
      .eq("status", "ativo");

    if (maxUsuarios > 0 && (userCount ?? 0) >= maxUsuarios) {
      return jsonResponse(
        {
          error: `Limite de usuários do plano atingido (máximo ${maxUsuarios}).`,
          code: "USER_LIMIT_REACHED",
        },
        429,
      );
    }

    const siteUrl = getSiteUrl();
    const empresaNome = (empresa?.nome as string | undefined) ?? "sua empresa";

    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          invited: true,
          empresa_id: String(callerPerfil.empresa_id),
          role,
          nome_completo: nomeCompleto,
        },
      });

    if (createError) {
      const message = createError.message.toLowerCase();
      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists") ||
        message.includes("duplicate")
      ) {
        return jsonResponse(
          {
            error: "Este e-mail já possui conta no sistema.",
            code: "EMAIL_EXISTS",
          },
          409,
        );
      }
      return jsonResponse({ error: createError.message }, 400);
    }

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo: `${siteUrl}/auth/accept-invite`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      if (createdUser.user?.id) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
      }
      return jsonResponse(
        { error: linkError?.message ?? "Falha ao gerar link de convite" },
        500,
      );
    }

    const template = userInviteEmail({
      nome: nomeCompleto,
      empresaNome,
      convidadoPor: callerPerfil.nome_completo?.trim() || undefined,
      actionLink: linkData.properties.action_link,
    });

    const emailResult = await sendBrevoEmail({
      toEmail: email,
      toName: nomeCompleto,
      subject: template.subject,
      htmlContent: template.html,
    });

    if (!emailResult.sent) {
      console.warn("Brevo invite email:", emailResult.warning);
    }

    return jsonResponse({
      success: true,
      message: emailResult.sent
        ? "Convite enviado por e-mail."
        : "Usuário criado, mas o e-mail não foi enviado. Verifique os secrets Brevo.",
      user_id: createdUser.user?.id ?? null,
      email_sent: emailResult.sent,
      email_warning: emailResult.warning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("invite-tenant-user error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
