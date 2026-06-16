import type { LlmProviderId } from "@/lib/byok/types";
import { getSupabase } from "@/lib/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type ByokAction = "validate" | "save" | "rotate" | "remove";

export interface ManageByokKeyInput {
  action: ByokAction;
  api_key?: string;
  provider?: LlmProviderId;
}

export interface ManageByokKeyResult {
  success: boolean;
  configured?: boolean;
  valid?: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export class ByokKeyError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ByokKeyError";
    this.code = code;
  }
}

async function parseFunctionError(
  error: FunctionsHttpError,
): Promise<{ message: string; code?: string }> {
  try {
    const body = await error.context.json();
    if (body && typeof body === "object" && "error" in body) {
      const err = body as { error?: string; code?: string };
      return {
        message: err.error ?? error.message,
        code: err.code,
      };
    }
  } catch {
    // ignore
  }
  return { message: error.message };
}

export async function manageByokKey(
  input: ManageByokKeyInput,
): Promise<ManageByokKeyResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("manage-byok-key", {
    body: input,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = await parseFunctionError(error);
      throw new ByokKeyError(parsed.message, parsed.code);
    }
    throw new ByokKeyError(error.message || "Erro ao gerenciar chave BYOK.");
  }

  const payload = data as ManageByokKeyResult | null;

  if (payload?.error) {
    throw new ByokKeyError(payload.error, payload.code);
  }

  if (!payload?.success) {
    throw new ByokKeyError("Resposta inesperada ao gerenciar chave BYOK.");
  }

  return payload;
}
