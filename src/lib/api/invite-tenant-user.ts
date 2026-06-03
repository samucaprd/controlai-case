import { getSupabase } from "@/lib/supabase/client";
import type { AppRole } from "@/features/auth/types";

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
