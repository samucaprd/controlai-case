import { getSupabase } from "@/lib/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

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

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  email_sent?: boolean;
  email_warning?: string | null;
}> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke(
    "request-password-reset",
    { body: { email: email.trim().toLowerCase() } },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new Error(await parseFunctionError(error));
    }
    throw new Error(error.message || "Não foi possível solicitar a recuperação.");
  }

  const payload = data as {
    error?: string;
    message?: string;
    email_sent?: boolean;
    email_warning?: string | null;
  } | null;

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return {
    message:
      payload?.message ??
      "Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes.",
    email_sent: payload?.email_sent,
    email_warning: payload?.email_warning ?? null,
  };
}

export async function completePasswordReset(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke(
    "complete-password-reset",
    { body: { token, password } },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new Error(await parseFunctionError(error));
    }
    throw new Error(error.message || "Não foi possível redefinir a senha.");
  }

  const payload = data as { error?: string; message?: string } | null;

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return {
    message: payload?.message ?? "Senha atualizada com sucesso.",
  };
}

export async function sendWelcomeEmail(): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return;

  await supabase.functions.invoke("send-welcome-email", {
    body: { email: user.email },
  });
}

export async function notifyInviteAccepted(): Promise<void> {
  const supabase = getSupabase();
  await supabase.functions.invoke("notify-invite-accepted", { body: {} });
}

export interface EmpresaDisponivelResult {
  disponivel: boolean;
  motivo: string | null;
}

export async function checkEmpresaDisponivel(
  nome: string,
): Promise<EmpresaDisponivelResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("check_empresa_disponivel", {
    p_nome: nome.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as { disponivel?: boolean; motivo?: string | null } | null;

  return {
    disponivel: Boolean(result?.disponivel),
    motivo: result?.motivo ?? null,
  };
}
