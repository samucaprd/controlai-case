import type { AuditLogsFilters } from "@/features/audit/types";
import { CACHE_TIMES } from "@/lib/query/query-client";

/** Índices compostos (migration 022) alinhados aos filtros da aba Logs */
export function getActiveAuditIndexHints(filters: AuditLogsFilters): string[] {
  const hints = new Set<string>();

  if (filters.empresaId != null) {
    hints.add("idx_audit_logs_empresa_created (empresa_id, created_at DESC)");
  }
  if (filters.tabela) {
    hints.add("idx_audit_logs_tabela_created (tabela, created_at DESC)");
  }
  if (filters.userId) {
    hints.add("idx_audit_logs_user_created (user_id, created_at DESC)");
  }
  if (hints.size === 0) {
    hints.add("idx_audit_logs_created (created_at DESC)");
  }

  return [...hints];
}

export function formatCacheAge(dataUpdatedAt: number): string {
  if (!dataUpdatedAt) return "—";

  const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

export const AUDIT_LOGS_CACHE = CACHE_TIMES.auditLogs;

export const EPIC7_PERFORMANCE_POINTS = [
  {
    title: "RPC única (sem N+1)",
    description:
      "list_audit_logs faz JOIN server-side (audit_logs + perfis + empresas) em uma única ida ao banco.",
  },
  {
    title: "Índices compostos",
    description:
      "Consultas ORDER BY created_at DESC usam índices parciais por empresa, tabela e usuário.",
  },
  {
    title: "Cache React Query",
    description: `staleTime ${CACHE_TIMES.auditLogs.staleTime / 1000}s · gcTime ${CACHE_TIMES.auditLogs.gcTime / 1000}s — evita refetch desnecessário ao trocar de aba.`,
  },
  {
    title: "Debounce na busca",
    description: "350ms de espera antes de consultar, reduzindo chamadas enquanto o usuário digita.",
  },
] as const;
