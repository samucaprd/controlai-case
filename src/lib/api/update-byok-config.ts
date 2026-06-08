import { getSupabase } from "@/lib/supabase/client";
import { mergeByokIntoContexto } from "@/lib/byok/contexto-ia";
import type { LlmProviderId } from "@/lib/byok/types";

export interface UpdateByokConfigInput {
  empresaId: number;
  contextoIa: unknown;
  enabled?: boolean;
  provider?: LlmProviderId;
}

export async function updateByokConfig(input: UpdateByokConfigInput): Promise<void> {
  const supabase = getSupabase();
  const nextContexto = mergeByokIntoContexto(input.contextoIa, {
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.provider !== undefined ? { provider: input.provider } : {}),
  });

  const { error } = await supabase
    .from("empresas")
    .update({ contexto_ia: nextContexto })
    .eq("id", input.empresaId);

  if (error) {
    throw new Error(error.message || "Erro ao atualizar configuração BYOK.");
  }
}
