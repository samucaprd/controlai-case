import type { AuditLogsFilters } from "@/features/audit/types";

export const queryKeys = {
  auditLogs: (filters: AuditLogsFilters) => ["audit-logs", filters] as const,
  dashboardStats: (scope: string, empresaId: string) =>
    ["dashboard-stats", scope, empresaId] as const,
  tenantUsage: (empresaId: string) => ["tenant-usage", empresaId] as const,
  tenantSubscription: (empresaId: string) => ["tenant-subscription", empresaId] as const,
  masterUsers: () => ["master-users"] as const,
  masterAudit: () => ["master-audit"] as const,
  masterPlatform: () => ["master-platform"] as const,
};
