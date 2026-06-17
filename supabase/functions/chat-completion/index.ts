import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENC_PREFIX = "enc:v1:";
const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

type LlmProvider = (typeof SUPPORTED_PROVIDERS)[number];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

interface ChatBody {
  message?: string;
  conversa_id?: number | null;
  agente_id?: number;
}

interface ByokConfig {
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

function parseByok(contexto: unknown): ByokConfig {
  const fallback: ByokConfig = { enabled: false, provider: "openai" };
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

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("BYOK_ENCRYPTION_KEY") ?? "";
  if (!raw) throw new Error("BYOK_ENCRYPTION_KEY não configurada");

  let keyBytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    }
  } else {
    keyBytes = base64ToBytes(raw);
    if (keyBytes.length !== 32) {
      throw new Error("BYOK_ENCRYPTION_KEY inválida");
    }
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptApiKey(stored: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) {
    throw new Error("Chave API em formato inválido");
  }
  const payload = stored.slice(ENC_PREFIX.length);
  const dot = payload.indexOf(".");
  if (dot === -1) throw new Error("Payload criptografado inválido");

  const iv = base64ToBytes(payload.slice(0, dot));
  const cipher = base64ToBytes(payload.slice(dot + 1));
  const key = await getEncryptionKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

function monthReference(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function buildTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= 60 ? t : `${t.slice(0, 57)}...`;
}

function parseStoredMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === "object" && "role" in m && "content" in m)
    .map((m) => ({
      role: (m as ChatMessage).role,
      content: String((m as ChatMessage).content),
      created_at: (m as ChatMessage).created_at,
    }))
    .filter((m) => m.role === "user" || m.role === "assistant");
}

async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ content: string; tokens: number }> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message ?? `OpenAI respondeu ${res.status}`;
    throw new Error(err);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const tokens = Number(data.usage?.total_tokens ?? 0);
  return { content: String(content), tokens };
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ content: string; tokens: number }> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message ?? `Anthropic respondeu ${res.status}`;
    throw new Error(err);
  }

  const content = data.content?.[0]?.text ?? "";
  const tokens = Number(data.usage?.input_tokens ?? 0) +
    Number(data.usage?.output_tokens ?? 0);
  return { content: String(content), tokens };
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
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuração incompleta" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ChatBody;
    const userMessage = body.message?.trim() ?? "";
    const agenteId = body.agente_id;
    const conversaId = body.conversa_id ?? null;

    if (!userMessage) {
      return jsonResponse({ error: "message é obrigatória" }, 400);
    }
    if (!agenteId) {
      return jsonResponse({ error: "Selecione um agente", code: "agent_required" }, 400);
    }

    const { data: perfil, error: perfilError } = await adminClient
      .from("perfis")
      .select("id, empresa_id, role")
      .eq("id", user.id)
      .single();
    if (perfilError || !perfil) {
      return jsonResponse({ error: "Perfil não encontrado" }, 403);
    }

    const empresaId = perfil.empresa_id as number;
    const isMaster = perfil.role === "master";

    const { data: empresa, error: empresaError } = await adminClient
      .from("empresas")
      .select("chave_api_llm, contexto_ia, plano_id, is_active, status")
      .eq("id", empresaId)
      .single();
    if (empresaError || !empresa) {
      return jsonResponse({ error: "Empresa não encontrada" }, 404);
    }
    if (!isMaster && (!empresa.is_active || empresa.status !== "ativa")) {
      return jsonResponse(
        { error: "Assinatura inativa. Contate o administrador.", code: "subscription_inactive" },
        403,
      );
    }

    const byok = parseByok(empresa.contexto_ia);
    const hasKey = Boolean(
      empresa.chave_api_llm && String(empresa.chave_api_llm).trim().length > 0,
    );
    if (!byok.enabled || !hasKey) {
      return jsonResponse(
        {
          error: "BYOK não configurado. O administrador deve cadastrar a chave API.",
          code: "byok_not_configured",
        },
        403,
      );
    }

    const { data: plano, error: planoError } = await adminClient
      .from("planos")
      .select("limite_mensagens_mes")
      .eq("id", empresa.plano_id as number)
      .single();
    if (planoError || !plano) {
      return jsonResponse({ error: "Plano não encontrado" }, 500);
    }

    const mesRef = monthReference();
    const { data: usoRow } = await adminClient
      .from("uso_recursos")
      .select("id, mensagens_enviadas, tokens_consumidos")
      .eq("empresa_id", empresaId)
      .eq("mes_referencia", mesRef)
      .maybeSingle();

    const mensagensUsadas = Number(usoRow?.mensagens_enviadas ?? 0);
    const limiteMensagens = Number(plano.limite_mensagens_mes ?? 0);
    if (!isMaster && limiteMensagens > 0 && mensagensUsadas >= limiteMensagens) {
      return jsonResponse(
        {
          error: `Limite mensal de mensagens atingido (${limiteMensagens}).`,
          code: "limit_reached",
          usage: { used: mensagensUsadas, limit: limiteMensagens },
        },
        429,
      );
    }

    const { data: agente, error: agenteError } = await adminClient
      .from("agentes_ia")
      .select("id, nome, instrucoes, is_active, empresa_id")
      .eq("id", agenteId)
      .eq("empresa_id", empresaId)
      .single();
    if (agenteError || !agente) {
      return jsonResponse({ error: "Agente não encontrado" }, 404);
    }
    if (!agente.is_active) {
      return jsonResponse({ error: "Agente inativo", code: "agent_inactive" }, 400);
    }

    let conversaRecord: {
      id: number;
      conversation_uuid: string;
      titulo: string | null;
      mensagens: unknown;
      tokens_usados: number;
    } | null = null;

    if (conversaId) {
      const { data, error } = await adminClient
        .from("conversas")
        .select("id, conversation_uuid, titulo, mensagens, tokens_usados, user_id, agente_id")
        .eq("id", conversaId)
        .eq("user_id", user.id)
        .eq("empresa_id", empresaId)
        .single();
      if (error || !data) {
        return jsonResponse({ error: "Conversa não encontrada" }, 404);
      }
      conversaRecord = data;
    }

    const history = parseStoredMessages(conversaRecord?.mensagens ?? []);
    const systemPrompt = String(agente.instrucoes ?? "").trim() ||
      `Você é o agente ${agente.nome}. Responda de forma útil e profissional.`;

    const apiKey = await decryptApiKey(String(empresa.chave_api_llm));
    const now = new Date().toISOString();

    const llmResult = byok.provider === "anthropic"
      ? await callAnthropic(apiKey, systemPrompt, history, userMessage)
      : await callOpenAi(apiKey, systemPrompt, history, userMessage);

    const newMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: userMessage, created_at: now },
      { role: "assistant", content: llmResult.content, created_at: now },
    ];

    const titulo = conversaRecord?.titulo ?? buildTitle(userMessage);
    const totalTokens = Number(conversaRecord?.tokens_usados ?? 0) + llmResult.tokens;

    let savedConversa: {
      id: number;
      conversation_uuid: string;
      titulo: string | null;
    };

    if (conversaRecord) {
      const { data, error } = await adminClient
        .from("conversas")
        .update({
          mensagens: newMessages,
          titulo,
          tokens_usados: totalTokens,
          agente_id: agenteId,
        })
        .eq("id", conversaRecord.id)
        .select("id, conversation_uuid, titulo")
        .single();
      if (error || !data) {
        return jsonResponse({ error: error?.message ?? "Falha ao salvar conversa" }, 500);
      }
      savedConversa = data;
    } else {
      const { data, error } = await adminClient
        .from("conversas")
        .insert({
          empresa_id: empresaId,
          user_id: user.id,
          agente_id: agenteId,
          mensagens: newMessages,
          titulo,
          tokens_usados: llmResult.tokens,
        })
        .select("id, conversation_uuid, titulo")
        .single();
      if (error || !data) {
        return jsonResponse({ error: error?.message ?? "Falha ao criar conversa" }, 500);
      }
      savedConversa = data;
    }

    const newMensagensUsadas = mensagensUsadas + 1;
    const newTokensConsumidos = Number(usoRow?.tokens_consumidos ?? 0) + llmResult.tokens;

    if (usoRow?.id) {
      await adminClient
        .from("uso_recursos")
        .update({
          mensagens_enviadas: newMensagensUsadas,
          tokens_consumidos: newTokensConsumidos,
        })
        .eq("id", usoRow.id);
    } else {
      await adminClient.from("uso_recursos").insert({
        empresa_id: empresaId,
        mes_referencia: mesRef,
        mensagens_enviadas: 1,
        tokens_consumidos: llmResult.tokens,
      });
    }

    return jsonResponse({
      success: true,
      conversa_id: savedConversa.id,
      conversation_uuid: savedConversa.conversation_uuid,
      titulo: savedConversa.titulo,
      mensagens: newMessages,
      assistant_message: llmResult.content,
      usage: {
        used: newMensagensUsadas,
        limit: isMaster ? 0 : limiteMensagens,
        remaining: isMaster ? -1 : Math.max(0, limiteMensagens - newMensagensUsadas),
      },
    });
  } catch (err) {
    console.error("[chat-completion]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Erro interno" },
      500,
    );
  }
});
