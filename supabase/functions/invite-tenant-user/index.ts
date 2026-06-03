import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteBody {
  email?: string;
  nome_completo?: string;
  role?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      .select("id, empresa_id, role")
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

    const { data: existingAuth, error: authLookupError } =
      await adminClient.auth.admin.getUserByEmail(email);

    if (authLookupError && authLookupError.message !== "User not found") {
      return jsonResponse({ error: authLookupError.message }, 500);
    }

    if (existingAuth?.user) {
      return jsonResponse(
        {
          error: "Este e-mail já possui conta no sistema.",
          code: "EMAIL_EXISTS",
        },
        409,
      );
    }

    const siteUrl =
      Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "http://localhost:3000";

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          invited: true,
          empresa_id: callerPerfil.empresa_id,
          role,
          nome_completo: nomeCompleto,
        },
        redirectTo: `${siteUrl}/auth/login`,
      });

    if (inviteError) {
      const message = inviteError.message.toLowerCase();
      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        return jsonResponse(
          {
            error: "Este e-mail já está cadastrado.",
            code: "EMAIL_EXISTS",
          },
          409,
        );
      }
      return jsonResponse({ error: inviteError.message }, 400);
    }

    return jsonResponse({
      success: true,
      message: "Convite enviado por e-mail.",
      user_id: inviteData.user?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
