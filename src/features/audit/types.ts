export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userNome: string | null;
  userEmail: string | null;
  empresaId: number | null;
  empresaNome: string | null;
  acao: string;
  tabela: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsFilters {
  empresaId?: number | null;
  tabela?: string | null;
  userId?: string | null;
  acao?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogUserOption {
  userId: string;
  userNome: string | null;
  userEmail: string | null;
}
