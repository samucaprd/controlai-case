import { getSupabase } from "@/lib/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface DeleteTenantUserInput {
  user_id: string;
  motivo?: string;
  notify_by_email?: boolean;
}

export class DeleteUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeleteUserError";
  }
}

export interface DeleteTenantUserResult {
  email_sent: boolean;
  email_warning: string | null;
}

async function parseFunctionError(error: FunctionsHttpError): Promise<string> {
  try {
    const body = await error.context.json();
    if (body && typeof body === "object" && "error" in body) {
      return String((body as { error?: string }).error ?? error.message);
    }
  } catch {
    // ignore
  }
  return error.message;
}

export async function deleteTenantUser(
  input: DeleteTenantUserInput,
): Promise<DeleteTenantUserResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("delete-tenant-user", {
    body: {
      user_id: input.user_id,
      motivo: input.motivo?.trim() || undefined,
      notify_by_email: input.notify_by_email ?? false,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new DeleteUserError(await parseFunctionError(error));
    }
    throw new DeleteUserError(
      error.message || "Não foi possível excluir o usuário.",
    );
  }

  const payload = data as {
    error?: string;
    success?: boolean;
    email_sent?: boolean;
    email_warning?: string | null;
  } | null;

  if (payload?.error) {
    throw new DeleteUserError(payload.error);
  }

  if (!payload?.success) {
    throw new DeleteUserError("Resposta inesperada ao excluir usuário.");
  }

  return {
    email_sent: Boolean(payload.email_sent),
    email_warning: payload.email_warning ?? null,
  };
}
