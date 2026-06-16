import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { passwordChangedEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface CompleteBody {
  token?: string;
  password?: string;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as CompleteBody;
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      return jsonResponse({ error: "Token inválido ou ausente" }, 400);
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "A senha deve ter pelo menos 8 caracteres" },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const tokenHash = await sha256Hex(token);

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return jsonResponse(
        { error: "Link inválido ou expirado. Solicite uma nova recuperação de senha." },
        400,
      );
    }

    if (tokenRow.used_at) {
      return jsonResponse(
        { error: "Este link já foi utilizado. Solicite uma nova recuperação de senha." },
        400,
      );
    }

    if (new Date(tokenRow.expires_at as string) < new Date()) {
      return jsonResponse(
        { error: "Link expirado. Solicite uma nova recuperação de senha." },
        400,
      );
    }

    const userId = tokenRow.user_id as string;

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password },
    );

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }

    await adminClient
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    const email = userData.user?.email ?? "";

    const { data: perfil } = await adminClient
      .from("perfis")
      .select("nome_completo, email")
      .eq("id", userId)
      .maybeSingle();

    const nome =
      perfil?.nome_completo?.trim() ||
      userData.user?.user_metadata?.nome_completo?.trim?.() ||
      email.split("@")[0] ||
      "usuário";

    const template = passwordChangedEmail({ nome });
    const emailResult = await sendBrevoEmail({
      toEmail: perfil?.email ?? email,
      toName: nome,
      subject: template.subject,
      htmlContent: template.html,
    });

    return jsonResponse({
      success: true,
      message: "Senha atualizada com sucesso.",
      confirmation_email_sent: emailResult.sent,
      email_warning: emailResult.warning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("complete-password-reset error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
