import { getSupabase } from "@/lib/supabase/client";
import { expandAuditSearchTerms } from "@/features/audit/expand-search";
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
  const searchRaw = filters.search?.trim() ?? "";

  // Primeira tentativa: busca completa (rótulos PT-BR via RPC)
  const { data, error } = await supabase.rpc("list_audit_logs", {
    p_empresa_id: filters.empresaId ?? null,
    p_tabela: filters.tabela ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
    p_search: searchRaw || null,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditLogRow[];
  if (rows.length > 0 || !searchRaw) {
    return rows.map(mapRow);
  }

  // Fallback: termos expandidos (CREATE → INSERT, etc.)
  const expanded = expandAuditSearchTerms(searchRaw);
  for (const term of expanded) {
    if (term === searchRaw) continue;
    const { data: retry, error: retryError } = await supabase.rpc("list_audit_logs", {
      p_empresa_id: filters.empresaId ?? null,
      p_tabela: filters.tabela ?? null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
      p_search: term,
    });
    if (retryError) throw new Error(retryError.message);
    if ((retry ?? []).length > 0) {
      return (retry as AuditLogRow[]).map(mapRow);
    }
  }

  return [];
}
