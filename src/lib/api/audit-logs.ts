import { getSupabase } from "@/lib/supabase/client";
import type { AuditLogEntry, AuditLogsFilters } from "@/features/audit/types";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_nome: string | null;
  user_email: string | null;
  empresa_id: number | null;
  empresa_nome: string | null;
  acao: string;
  tabela: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  created_at: string;
}

function mapRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userNome: row.user_nome,
    userEmail: row.user_email,
    empresaId: row.empresa_id,
    empresaNome: row.empresa_nome,
    acao: row.acao,
    tabela: row.tabela,
    antes: row.antes,
    depois: row.depois,
    createdAt: row.created_at,
  };
}

export async function fetchAuditLogs(filters: AuditLogsFilters): Promise<AuditLogEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("list_audit_logs", {
    p_empresa_id: filters.empresaId ?? null,
    p_tabela: filters.tabela ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
    p_search: filters.search?.trim() || null,
  });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AuditLogRow[]).map(mapRow);
}
