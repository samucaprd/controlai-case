import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENC_PREFIX = "enc:v1:";
const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;

type LlmProvider = (typeof SUPPORTED_PROVIDERS)[number];
type ByokAction = "validate" | "save" | "rotate" | "remove";

interface ByokBody {
  action?: ByokAction;
  api_key?: string;
  provider?: string;
}

interface ByokContextConfig {
  enabled: boolean;
  provider: LlmProvider;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isSupportedProvider(value: string | undefined): value is LlmProvider {
  return SUPPORTED_PROVIDERS.includes(value as LlmProvider);
}

function parseByokFromContexto(contexto: unknown): ByokContextConfig {
  const fallback: ByokContextConfig = { enabled: false, provider: "openai" };
  if (!contexto || typeof contexto !== "object") return fallback;

  const byok = (contexto as Record<string, unknown>).byok;
  if (!byok || typeof byok !== "object") return fallback;

  const record = byok as Record<string, unknown>;
  return {
    enabled: Boolean(record.enabled),
    provider: isSupportedProvider(String(record.provider ?? ""))
      ? (record.provider as LlmProvider)
      : "openai",
  };
}

function mergeByokIntoContexto(
  contexto: unknown,
  patch: Partial<ByokContextConfig>,
): Record<string, unknown> {
  const base =
    contexto && typeof contexto === "object" ? { ...(contexto as Record<string, unknown>) } : {};
  const current = parseByokFromContexto(contexto);
  return {
    ...base,
    byok: { ...current, ...patch },
  };
}

function isPlausibleKey(provider: LlmProvider, key: string): boolean {
  const k = key.trim();
  if (k.length < 20) return false;
  switch (provider) {
    case "openai":
      return k.startsWith("sk-") || k.startsWith("sk-proj-");
    case "anthropic":
      return k.startsWith("sk-ant-");
    default:
      return false;
  }
}

function keyFormatHint(provider: LlmProvider): string {
  switch (provider) {
    case "openai":
      return "Formato inválido. Use uma chave OpenAI (sk-...).";
    case "anthropic":
      return "Formato inválido. Use uma chave Anthropic (sk-ant-...).";
    default:
      return "Formato de chave inválido.";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("BYOK_ENCRYPTION_KEY") ?? "";
  if (!raw) {
    throw new Error("BYOK_ENCRYPTION_KEY não configurada na Edge Function");
  }
  let keyBytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    }
  } else {
    keyBytes = base64ToBytes(raw);
    if (keyBytes.length !== 32) {
      throw new Error("BYOK_ENCRYPTION_KEY deve ter 32 bytes (hex 64 chars ou base64)");
    }
  }
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptApiKey(plain: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain.trim());
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return `${ENC_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

async function validateProviderKey(
  provider: LlmProvider,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  const trimmed = apiKey.trim();
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.ok) return { ok: true, message: "Chave válida (OpenAI)." };
      if (res.status === 401) {
        return { ok: false, message: "Chave rejeitada pela OpenAI (401)." };
      }
      return { ok: false, message: `OpenAI respondeu ${res.status}.` };
    }
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        method: "GET",
        headers: {
          "x-api-key": trimmed,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.ok) return { ok: true, message: "Chave válida (Anthropic)." };
      if (res.status === 401) {
        return { ok: false, message: "Chave rejeitada pela Anthropic (401)." };
      }
      return { ok: false, message: `Anthropic respondeu ${res.status}.` };
    }
    return { ok: false, message: "Provedor não suportado." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao validar chave",
    };
  }
}

async function writeAudit(
  adminClient: ReturnType<typeof createClient>,
  params: {
    userId: string;
    empresaId: number;
    acao: string;
    detalhes?: Record<string, unknown>;
  },
) {
  await adminClient.from("auditoria").insert({
    user_id: params.userId,
    acao: params.acao,
    entidade_tipo: "empresa",
    entidade_id: params.empresaId,
    empresa_id: params.empresaId,
    detalhes: params.detalhes ?? {},
  });
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
        { error: "Apenas admin ou master podem gerenciar a chave BYOK" },
        403,
      );
    }

    const body = (await req.json()) as ByokBody;
    const action = body.action;
    if (!action || !["validate", "save", "rotate", "remove"].includes(action)) {
      return jsonResponse({ error: "action inválida" }, 400);
    }

    const empresaId = callerPerfil.empresa_id as number;

    const { data: empresaRow, error: empresaLoadError } = await adminClient
      .from("empresas")
      .select("chave_api_llm, contexto_ia")
      .eq("id", empresaId)
      .single();
    if (empresaLoadError || !empresaRow) {
      return jsonResponse({ error: "Empresa não encontrada" }, 404);
    }

    const storedByok = parseByokFromContexto(empresaRow.contexto_ia);
    const provider = isSupportedProvider(body.provider)
      ? body.provider
      : storedByok.provider;
    if (!isSupportedProvider(provider)) {
      return jsonResponse({ error: "Provedor LLM inválido ou indisponível." }, 400);
    }
    if (action === "remove") {
      const nextContexto = mergeByokIntoContexto(empresaRow.contexto_ia, {
        provider,
        enabled: storedByok.enabled,
      });

      const { error: updateError } = await adminClient
        .from("empresas")
        .update({ chave_api_llm: null, contexto_ia: nextContexto })
        .eq("id", empresaId);
      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }
      await writeAudit(adminClient, {
        userId: user.id,
        empresaId,
        acao: "byok_removida",
        detalhes: { provider },
      });

      return jsonResponse({
        success: true,
        configured: false,
        message: "Chave API removida.",
      });
    }

    const apiKey = body.api_key?.trim() ?? "";
    if (!apiKey) {
      return jsonResponse({ error: "api_key é obrigatória" }, 400);
    }
    if (!isPlausibleKey(provider, apiKey)) {
      return jsonResponse({ error: keyFormatHint(provider) }, 400);
    }

    const validation = await validateProviderKey(provider, apiKey);
    if (!validation.ok) {
      return jsonResponse(
        { error: validation.message, code: "invalid_api_key" },
        400,
      );
    }
    if (action === "validate") {
      return jsonResponse({
        success: true,
        valid: true,
        message: validation.message,
      });
    }

    const hasExisting = Boolean(
      empresaRow.chave_api_llm && String(empresaRow.chave_api_llm).trim().length > 0,
    );
    if (action === "save" && hasExisting) {
      return jsonResponse(
        {
          error: "Já existe uma chave configurada. Use rotate para substituir.",
          code: "key_exists",
        },
        409,
      );
    }
    if (action === "rotate" && !hasExisting) {
      return jsonResponse(
        {
          error: "Nenhuma chave configurada. Use save para cadastrar.",
          code: "no_key",
        },
        400,
      );
    }

    const encrypted = await encryptApiKey(apiKey);
    const nextContexto = mergeByokIntoContexto(empresaRow.contexto_ia, {
      provider,
      enabled: true,
    });

    const { error: updateError } = await adminClient
      .from("empresas")
      .update({ chave_api_llm: encrypted, contexto_ia: nextContexto })
      .eq("id", empresaId);
    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    const auditAction = action === "rotate" ? "byok_rotacionada" : "byok_cadastrada";
    await writeAudit(adminClient, {
      userId: user.id,
      empresaId,
      acao: auditAction,
      detalhes: { provider, validated: true },
    });

    return jsonResponse({
      success: true,
      configured: true,
      message:
        action === "rotate"
          ? "Chave rotacionada e validada com sucesso."
          : "Chave cadastrada e validada com sucesso.",
    });
  } catch (err) {
    console.error("[manage-byok-key]", err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : "Erro interno",
      },
      500,
    );
  }
});
