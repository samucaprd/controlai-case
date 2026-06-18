import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail, getSiteUrl } from "../_shared/brevo.ts";
import { userInviteEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface InviteBody {
  email?: string;
  nome_completo?: string;
  role?: string;
}

interface ExistingPerfil {
  id: string;
  empresa_id: number;
  nome_completo: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendInviteEmail(params: {
  adminClient: SupabaseClient;
  email: string;
  nomeCompleto: string;
  empresaNome: string;
  convidadoPor?: string;
}): Promise<{ sent: boolean; warning?: string; actionLink?: string }> {
  const siteUrl = getSiteUrl();

  const { data: linkData, error: linkError } =
    await params.adminClient.auth.admin.generateLink({
      type: "invite",
      email: params.email,
      options: {
        redirectTo: `${siteUrl}/auth/accept-invite`,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error(linkError?.message ?? "Falha ao gerar link de convite");
  }

  const template = userInviteEmail({
    nome: params.nomeCompleto,
    empresaNome: params.empresaNome,
    convidadoPor: params.convidadoPor,
    actionLink: linkData.properties.action_link,
  });

  const emailResult = await sendBrevoEmail({
    toEmail: params.email,
    toName: params.nomeCompleto,
    subject: template.subject,
    htmlContent: template.html,
  });

  if (!emailResult.sent) {
    console.warn("Brevo invite email:", emailResult.warning);
  }

  return {
    sent: emailResult.sent,
    warning: emailResult.warning ?? undefined,
    actionLink: linkData.properties.action_link,
  };
}

async function resendTenantInvite(params: {
  adminClient: SupabaseClient;
  existingPerfil: ExistingPerfil;
  email: string;
  nomeCompleto: string;
  role: "user" | "admin";
  empresaId: number;
  empresaNome: string;
  convidadoPor?: string;
}) {
  const { adminClient, existingPerfil, email, nomeCompleto, role, empresaId } =
    params;

  await adminClient
    .from("perfis")
    .update({ nome_completo: nomeCompleto, role })
    .eq("id", existingPerfil.id);

  await adminClient.auth.admin.updateUserById(existingPerfil.id, {
    user_metadata: {
      invited: true,
      empresa_id: String(empresaId),
      role,
      nome_completo: nomeCompleto,
    },
  });

  const emailResult = await sendInviteEmail({
    adminClient,
    email,
    nomeCompleto,
    empresaNome: params.empresaNome,
    convidadoPor: params.convidadoPor,
  });

  return jsonResponse({
    success: true,
    resent: true,
    message: emailResult.sent
      ? "Convite reenviado por e-mail."
      : "Convite atualizado, mas o e-mail não foi enviado. Verifique os secrets Brevo.",
    user_id: existingPerfil.id,
    email_sent: emailResult.sent,
    email_warning: emailResult.warning ?? null,
  });
}

async function cleanupOrphanAuthUser(
  adminClient: SupabaseClient,
  email: string,
): Promise<void> {
  const { data: authUserId, error } = await adminClient.rpc(
    "auth_user_id_by_email",
    { p_email: email },
  );

  if (error || !authUserId) return;

  const { data: linkedPerfil } = await adminClient
    .from("perfis")
    .select("id")
    .eq("id", authUserId as string)
    .maybeSingle();

  if (!linkedPerfil) {
    await adminClient.auth.admin.deleteUser(authUserId as string);
  }
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

    const isMaster = callerPerfil.role === "master";

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

    const { data: empresa } = await adminClient
      .from("empresas")
      .select("nome, plano_id")
      .eq("id", callerPerfil.empresa_id)
      .single();

    const empresaNome = (empresa?.nome as string | undefined) ?? "sua empresa";

    const { data: existingPerfil } = await adminClient
      .from("perfis")
      .select("id, empresa_id, nome_completo")
      .ilike("email", email)
      .maybeSingle();

    if (existingPerfil) {
      if (existingPerfil.empresa_id !== callerPerfil.empresa_id) {
        return jsonResponse(
          {
            error:
              "Este e-mail já está vinculado a outra empresa na plataforma. O colaborador deve usar essa conta ou outro e-mail.",
            code: "EMAIL_OTHER_TENANT",
          },
          409,
        );
      }

      const { data: authUserData, error: authLookupError } =
        await adminClient.auth.admin.getUserById(existingPerfil.id);

      if (authLookupError || !authUserData?.user) {
        return jsonResponse(
          {
            error:
              "Encontramos um cadastro inconsistente para este e-mail. Exclua o usuário na lista e tente novamente.",
            code: "PROFILE_AUTH_MISMATCH",
          },
          409,
        );
      }

      if (authUserData.user.last_sign_in_at) {
        return jsonResponse(
          {
            error:
              "Este colaborador já aceitou o convite e faz parte da sua empresa.",
            code: "ALREADY_ACTIVE_MEMBER",
          },
          409,
        );
      }

      return await resendTenantInvite({
        adminClient,
        existingPerfil,
        email,
        nomeCompleto,
        role,
        empresaId: callerPerfil.empresa_id,
        empresaNome,
        convidadoPor: callerPerfil.nome_completo?.trim() || undefined,
      });
    }

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

    if (!isMaster && maxUsuarios > 0 && (userCount ?? 0) >= maxUsuarios) {
      return jsonResponse(
        {
          error: `Limite de usuários do plano atingido (máximo ${maxUsuarios}).`,
          code: "USER_LIMIT_REACHED",
        },
        429,
      );
    }

    await cleanupOrphanAuthUser(adminClient, email);

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
        const { data: retryPerfil } = await adminClient
          .from("perfis")
          .select("id, empresa_id, nome_completo")
          .ilike("email", email)
          .maybeSingle();

        if (
          retryPerfil &&
          retryPerfil.empresa_id === callerPerfil.empresa_id
        ) {
          const { data: authUserData } = await adminClient.auth.admin
            .getUserById(retryPerfil.id);

          if (!authUserData?.user?.last_sign_in_at) {
            return await resendTenantInvite({
              adminClient,
              existingPerfil: retryPerfil,
              email,
              nomeCompleto,
              role,
              empresaId: callerPerfil.empresa_id,
              empresaNome,
              convidadoPor: callerPerfil.nome_completo?.trim() || undefined,
            });
          }
        }

        return jsonResponse(
          {
            error:
              "Este e-mail já possui conta no sistema. Se for de outra empresa, use outro e-mail.",
            code: "EMAIL_EXISTS",
          },
          409,
        );
      }
      return jsonResponse({ error: createError.message }, 400);
    }

    let emailResult: { sent: boolean; warning?: string };
    try {
      emailResult = await sendInviteEmail({
        adminClient,
        email,
        nomeCompleto,
        empresaNome,
        convidadoPor: callerPerfil.nome_completo?.trim() || undefined,
      });
    } catch (linkErr) {
      if (createdUser.user?.id) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
      }
      const linkMessage =
        linkErr instanceof Error ? linkErr.message : "Falha ao gerar link de convite";
      return jsonResponse({ error: linkMessage }, 500);
    }

    return jsonResponse({
      success: true,
      resent: false,
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
