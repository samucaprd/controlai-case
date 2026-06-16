import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { passwordResetEmail } from "../_shared/email-templates.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSiteUrl } from "../_shared/brevo.ts";

interface ResetBody {
  email?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
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
    const body = (await req.json()) as ResetBody;
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: "E-mail inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: perfil, error: perfilLookupError } = await adminClient
      .from("perfis")
      .select("id, nome_completo")
      .ilike("email", email)
      .maybeSingle();

    if (perfilLookupError) {
      console.error("perfil lookup error:", perfilLookupError.message);
    }

    if (!perfil?.id) {
      return jsonResponse({
        success: true,
        message:
          "Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes.",
      });
    }

    const plainToken = randomToken();
    const tokenHash = await sha256Hex(plainToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const userId = perfil.id as string;

    await adminClient
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", userId)
      .is("used_at", null);

    const { error: insertError } = await adminClient
      .from("password_reset_tokens")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("token insert error:", insertError.message);
      return jsonResponse({ error: "Não foi possível processar a solicitação" }, 500);
    }

    const nome =
      perfil.nome_completo?.trim() ||
      email.split("@")[0];

    const resetLink =
      `${getSiteUrl()}/auth/reset-password?token=${encodeURIComponent(plainToken)}`;

    const template = passwordResetEmail({ nome, resetLink });
    const emailResult = await sendBrevoEmail({
      toEmail: email,
      toName: nome,
      subject: template.subject,
      htmlContent: template.html,
    });

    if (!emailResult.sent) {
      console.warn("Brevo reset email:", emailResult.warning);
    }

    return jsonResponse({
      success: true,
      message:
        "Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes.",
      email_sent: emailResult.sent,
      email_warning: emailResult.warning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("request-password-reset error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
