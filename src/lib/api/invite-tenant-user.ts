import { getSupabase } from "@/lib/supabase/client";
import type { AppRole } from "@/features/auth/types";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface InviteTenantUserInput {
  email: string;
  nome_completo: string;
  role: Extract<AppRole, "user" | "admin">;
}

export class InviteUserError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "InviteUserError";
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
    // ignore parse errors
  }
  return { message: error.message };
}

export async function inviteTenantUser(
  input: InviteTenantUserInput,
): Promise<void> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("invite-tenant-user", {
    body: {
      email: input.email.trim().toLowerCase(),
      nome_completo: input.nome_completo.trim(),
      role: input.role,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = await parseFunctionError(error);
      throw new InviteUserError(parsed.message, parsed.code);
    }
    throw new InviteUserError(
      error.message || "Não foi possível enviar o convite.",
    );
  }

  const payload = data as {
    error?: string;
    code?: string;
    success?: boolean;
  } | null;

  if (payload?.error) {
    throw new InviteUserError(payload.error, payload.code);
  }

  if (!payload?.success) {
    throw new InviteUserError("Resposta inesperada ao convidar usuário.");
  }
}
