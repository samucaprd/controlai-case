import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api/audit-logs";
import { CACHE_TIMES } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/cache-keys";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AuditLogsFilters } from "@/features/audit/types";

export function useAuditLogs(isMaster: boolean) {
  const useSupabase = isSupabaseConfigured();
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [tabela, setTabela] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");
  const [acao, setAcao] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters: AuditLogsFilters = useMemo(
    () => ({
      empresaId: isMaster ? empresaId : undefined,
      tabela: tabela === "all" ? null : tabela,
      userId: userId === "all" ? null : userId,
      acao: acao === "all" ? null : acao,
      search: debouncedSearch,
      limit: 100,
      offset: 0,
    }),
    [isMaster, empresaId, tabela, userId, acao, debouncedSearch],
  );

  const query = useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: () => fetchAuditLogs(filters),
    enabled: useSupabase,
    staleTime: CACHE_TIMES.auditLogs.staleTime,
    gcTime: CACHE_TIMES.auditLogs.gcTime,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh: query.refetch,
    useSupabase,
    empresaId,
    setEmpresaId,
    tabela,
    setTabela,
    userId,
    setUserId,
    acao,
    setAcao,
    search,
    setSearch,
    filters,
  };
}
