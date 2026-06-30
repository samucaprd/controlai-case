import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogUsers } from "@/lib/api/audit-logs";
import { CACHE_TIMES } from "@/lib/query/query-client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export function useAuditUsersFilter(enabled: boolean, empresaId: number | null) {
  const useSupabase = isSupabaseConfigured();

  return useQuery({
    queryKey: ["audit-users-filter", empresaId],
    queryFn: () => fetchAuditLogUsers(empresaId),
    enabled: useSupabase && enabled,
    staleTime: CACHE_TIMES.auditLogs.staleTime,
    gcTime: CACHE_TIMES.auditLogs.gcTime,
  });
}
