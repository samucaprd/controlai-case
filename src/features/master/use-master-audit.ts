import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api/audit-logs";
import { CACHE_TIMES } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/cache-keys";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AuditLogEntry } from "@/features/audit/types";

export type { AuditLogEntry };

/** Logs da plataforma via RPC `list_audit_logs` (join único, sem N+1). */
export function useMasterAudit() {
  const useSupabase = isSupabaseConfigured();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: [...queryKeys.masterAudit(), search] as const,
    queryFn: () => fetchAuditLogs({ search, limit: 200, offset: 0 }),
    enabled: useSupabase,
    staleTime: CACHE_TIMES.auditLogs.staleTime,
    gcTime: CACHE_TIMES.auditLogs.gcTime,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    search,
    setSearch,
    refresh: query.refetch,
    useSupabase,
  };
}
