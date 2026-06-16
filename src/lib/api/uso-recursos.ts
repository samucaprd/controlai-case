import { getSupabase } from "@/lib/supabase/client";

export interface TenantUsageLimits {
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
}

export interface TenantUsageSnapshot {
  empresa_id: number;
  mes_referencia: string;
  mensagens_enviadas: number;
  tokens_consumidos: number;
  usuarios_ativos: number;
  agentes_ativos: number;
  limites: TenantUsageLimits;
}

export async function fetchTenantUsage(
  empresaId?: number,
): Promise<TenantUsageSnapshot | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("get_tenant_usage", {
    p_empresa_id: empresaId ?? null,
  });

  if (error) {
    console.error("[uso-recursos]", error);
    return null;
  }

  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  const limites = row.limites as Record<string, unknown> | undefined;

  return {
    empresa_id: Number(row.empresa_id ?? 0),
    mes_referencia: String(row.mes_referencia ?? ""),
    mensagens_enviadas: Number(row.mensagens_enviadas ?? 0),
    tokens_consumidos: Number(row.tokens_consumidos ?? 0),
    usuarios_ativos: Number(row.usuarios_ativos ?? 0),
    agentes_ativos: Number(row.agentes_ativos ?? 0),
    limites: {
      max_usuarios: Number(limites?.max_usuarios ?? 0),
      max_agentes: Number(limites?.max_agentes ?? 0),
      limite_mensagens_mes: Number(limites?.limite_mensagens_mes ?? 0),
    },
  };
}
