import type { LlmProviderId } from "./types";
import { isLlmProviderId } from "./types";

export interface ByokContextConfig {
  enabled: boolean;
  provider: LlmProviderId;
}

const DEFAULT_BYOK: ByokContextConfig = {
  enabled: false,
  provider: "openai",
};

export function parseByokFromContexto(contexto: unknown): ByokContextConfig {
  if (!contexto || typeof contexto !== "object") return DEFAULT_BYOK;

  const byok = (contexto as Record<string, unknown>).byok;
  if (!byok || typeof byok !== "object") return DEFAULT_BYOK;

  const record = byok as Record<string, unknown>;
  return {
    enabled: Boolean(record.enabled),
    provider: isLlmProviderId(record.provider) ? record.provider : DEFAULT_BYOK.provider,
  };
}

export function mergeByokIntoContexto(
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
