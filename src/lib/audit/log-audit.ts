import { getSupabase } from "@/lib/supabase/client";

export interface LogAuditInput {
  acao: string;
  entidade_tipo: string;
  entidade_id?: number | null;
  empresa_id?: number | null;
  detalhes?: Record<string, unknown>;
}

/** Registra ação administrativa via RPC (SECURITY DEFINER). Falhas são silenciosas. */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.rpc("log_auditoria", {
      p_acao: input.acao,
      p_entidade_tipo: input.entidade_tipo,
      p_entidade_id: input.entidade_id ?? null,
      p_empresa_id: input.empresa_id ?? null,
      p_detalhes: input.detalhes ?? {},
    });
    if (error) {
      console.warn("[auditoria]", error.message);
    }
  } catch (err) {
    console.warn("[auditoria]", err);
  }
}
