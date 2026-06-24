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
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  perfis: "Usuário",
  empresas: "Empresa",
  agentes_ia: "Agente IA",
  planos: "Plano",
  perfil: "Usuário",
};

function dbOpLabel(acao: string, entidadeTipo?: string | null): string | null {
  if (!entidadeTipo) return null;
  const labels = DB_OP_LABELS[entidadeTipo];
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
  return ENTITY_TYPE_LABELS[entidadeTipo] ?? entidadeTipo.replaceAll("_", " ");
}

export function formatDashboardPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
