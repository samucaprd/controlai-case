import type { ChatMessage, ChatUsage } from "@/features/chat/types";
import { getSupabase } from "@/lib/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface SendChatMessageInput {
  message: string;
  agente_id: number;
  conversa_id?: number | null;
}

export interface SendChatMessageResult {
  success: boolean;
  conversa_id: number;
  conversation_uuid: string;
  titulo: string;
  mensagens: ChatMessage[];
  assistant_message: string;
  usage: ChatUsage;
}

export class ChatCompletionError extends Error {
  code?: string;
  usage?: ChatUsage;

  constructor(message: string, code?: string, usage?: ChatUsage) {
    super(message);
    this.name = "ChatCompletionError";
    this.code = code;
    this.usage = usage;
  }
}

async function parseFunctionError(
  error: FunctionsHttpError,
): Promise<{ message: string; code?: string; usage?: ChatUsage }> {
  try {
    const body = await error.context.json();
    if (body && typeof body === "object") {
      const err = body as {
        error?: string;
        code?: string;
        usage?: { used: number; limit: number; remaining?: number };
      };
      const usage = err.usage
        ? {
            used: err.usage.used,
            limit: err.usage.limit,
            remaining: err.usage.remaining ?? Math.max(0, err.usage.limit - err.usage.used),
          }
        : undefined;
      return {
        message: err.error ?? error.message,
        code: err.code,
        usage,
      };
    }
  } catch {
    // ignore
  }
  return { message: error.message };
}

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("chat-completion", {
    body: input,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = await parseFunctionError(error);
      throw new ChatCompletionError(parsed.message, parsed.code, parsed.usage);
    }
    throw new ChatCompletionError(error.message || "Erro ao enviar mensagem.");
  }

  const payload = data as SendChatMessageResult | null;
  if (!payload?.success) {
    const err = data as { error?: string; code?: string; usage?: ChatUsage } | null;
    throw new ChatCompletionError(
      err?.error ?? "Resposta inesperada do chat.",
      err?.code,
      err?.usage,
    );
  }

  return payload;
}
