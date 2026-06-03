import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export interface AuditLogEntry {
  id: number;
  acao: string;
  entidade_tipo: string;
  entidade_id: number | null;
  empresa_id: number | null;
  empresa_nome: string | null;
  user_nome: string | null;
  user_email: string | null;
  detalhes: Record<string, unknown>;
  created_at: string;
}

export function useMasterAudit() {
  const useSupabase = isSupabaseConfigured();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(useSupabase);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!useSupabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("auditoria")
        .select(
          "id, acao, entidade_tipo, entidade_id, empresa_id, detalhes, created_at, perfis(nome_completo, email), empresas(nome)",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const mapped: AuditLogEntry[] = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const perfil = r.perfis as Record<string, unknown> | null;
        const empresa = r.empresas as Record<string, unknown> | null;
        return {
          id: r.id as number,
          acao: r.acao as string,
          entidade_tipo: r.entidade_tipo as string,
          entidade_id: (r.entidade_id as number) ?? null,
          empresa_id: (r.empresa_id as number) ?? null,
          empresa_nome: (empresa?.nome as string) ?? null,
          user_nome: (perfil?.nome_completo as string) ?? null,
          user_email: (perfil?.email as string) ?? null,
          detalhes: (r.detalhes as Record<string, unknown>) ?? {},
          created_at: r.created_at as string,
        };
      });

      setLogs(mapped);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      log.acao.toLowerCase().includes(q) ||
      log.entidade_tipo.toLowerCase().includes(q) ||
      (log.empresa_nome?.toLowerCase().includes(q) ?? false) ||
      (log.user_email?.toLowerCase().includes(q) ?? false) ||
      (log.user_nome?.toLowerCase().includes(q) ?? false)
    );
  });

  return {
    logs: filteredLogs,
    isLoading,
    search,
    setSearch,
    refresh: fetchLogs,
    useSupabase,
  };
}
