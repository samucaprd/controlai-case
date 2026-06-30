const ACTIVITY_LABELS: Record<string, string> = {
  empresa_criada: "Empresa criada",
  empresa_atualizada: "Empresa atualizada",
  empresa_excluida: "Empresa excluída",
  plano_criado: "Plano criado",
  plano_atualizado: "Plano atualizado",
  plano_excluido: "Plano excluído",
  plano_toggle: "Plano ativado/desativado",
  usuario_convidado: "Usuário convidado",
  usuario_atualizado: "Usuário atualizado",
  usuario_excluido: "Usuário excluído",
  master_usuario_atualizado: "Usuário atualizado (Master)",
  byok_cadastrada: "BYOK cadastrada",
  byok_rotacionada: "BYOK rotacionada",
  byok_removida: "BYOK removida",
};

const DB_OP_LABELS: Record<string, { insert: string; update: string; delete: string }> = {
  perfis: {
    insert: "Usuário criado",
    update: "Usuário atualizado",
    delete: "Usuário excluído",
  },
  empresas: {
    insert: "Empresa criada",
    update: "Empresa atualizada",
    delete: "Empresa excluída",
  },
  agentes_ia: {
    insert: "Agente IA criado",
    update: "Agente IA atualizado",
    delete: "Agente IA excluído",
  },
  planos: {
    insert: "Plano criado",
    update: "Plano atualizado",
    delete: "Plano excluído",
  },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  perfis: "Usuário",
  empresas: "Empresa",
  agentes_ia: "Agente IA",
  planos: "Plano",
  conversas: "Conversa",
};

/** Aliases semânticos (log_auditoria) → nome real da tabela no banco */
const AUDIT_TABLE_ALIASES: Record<string, string> = {
  empresa: "empresas",
  perfil: "perfis",
  plano: "planos",
  conversa: "conversas",
};

export function normalizeAuditTable(tabela: string): string {
  const key = tabela.trim().toLowerCase();
  return AUDIT_TABLE_ALIASES[key] ?? key;
}

function dbOpLabel(acao: string, entidadeTipo?: string | null): string | null {
  if (!entidadeTipo) return null;
  const canonical = normalizeAuditTable(entidadeTipo);
  const labels = DB_OP_LABELS[canonical];
  if (!labels) return null;
  if (acao === "INSERT") return labels.insert;
  if (acao === "UPDATE") return labels.update;
  if (acao === "DELETE") return labels.delete;
  return null;
}

export function formatActivityLabel(acao: string, entidadeTipo?: string | null): string {
  const fromDb = dbOpLabel(acao, entidadeTipo);
  if (fromDb) return fromDb;

  if (acao === "INSERT") return "Registro criado";
  if (acao === "UPDATE") return "Registro atualizado";
  if (acao === "DELETE") return "Registro excluído";

  return ACTIVITY_LABELS[acao] ?? acao.replaceAll("_", " ");
}

export function formatEntityTipo(entidadeTipo: string): string {
  const canonical = normalizeAuditTable(entidadeTipo);
  return (
    ENTITY_TYPE_LABELS[canonical] ??
    canonical.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Rótulo amigável + nome técnico canônico da tabela */
export function formatAuditTableDisplay(tabela: string): { label: string; technical: string } {
  const canonical = normalizeAuditTable(tabela);
  return {
    label: formatEntityTipo(canonical),
    technical: canonical,
  };
}

export function formatDashboardPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
