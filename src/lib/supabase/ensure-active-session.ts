import { getSupabase } from "./client";

export class SessionExpiredError extends Error {
  constructor(message = "Sessão expirada. Faça login novamente.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

function isRefreshTokenError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("refresh token") ||
    lower.includes("invalid jwt") ||
    lower.includes("jwt expired")
  );
}

/** Limpa storage corrompido quando o refresh token não existe mais no servidor. */
export async function clearInvalidAuthStorage(): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.getSession();
  if (error && isRefreshTokenError(error.message)) {
    await supabase.auth.signOut({ scope: "local" });
    return true;
  }
  return false;
}

/** Garante JWT válido antes de chamar Edge Functions. */
export async function ensureActiveSession(): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    if (isRefreshTokenError(error.message)) {
      await supabase.auth.signOut({ scope: "local" });
    }
    throw new SessionExpiredError();
  }

  if (!data.session) {
    throw new SessionExpiredError();
  }

  const expiresAtMs = (data.session.expires_at ?? 0) * 1000;
  if (expiresAtMs < Date.now() + 60_000) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError || !refreshed.session) {
      if (refreshError && isRefreshTokenError(refreshError.message)) {
        await supabase.auth.signOut({ scope: "local" });
      }
      throw new SessionExpiredError();
    }
  }
}
