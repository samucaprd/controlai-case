/** Rótulos PT-BR para campos comuns nos payloads de auditoria */

const FIELD_LABELS: Record<string, string> = {
  nome_completo: "Nome completo",
  email: "E-mail",
  role: "Papel",
  cargo: "Cargo",
  status: "Status",
  nome: "Nome",
  cnpj: "CNPJ",
  plano_id: "Plano",
  ativo: "Ativo",
  titulo: "Título",
  descricao: "Descrição",
  prompt_sistema: "Prompt do sistema",
  modelo: "Modelo",
  temperatura: "Temperatura",
  max_tokens: "Máx. tokens",
  is_ativo: "Ativo",
  is_active: "Ativo",
  entidade_id: "ID da entidade",
  detalhes: "Detalhes",
  telefone: "Telefone",
  site: "Site",
  endereco: "Endereço",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
  master: "Master",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  ativa: "Ativa",
  inativo: "Inativo",
  inativa: "Inativa",
  pendente: "Pendente",
  convidado: "Convidado",
  suspensa: "Suspensa",
};

/** Campos de metadados omitidos na visualização do diff */
export const AUDIT_METADATA_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "ultimo_acesso",
  "avatar_url",
  "empresa_id",
  "entidade_id",
]);

export function formatAuditFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

export function formatAuditFieldValue(field: string, value: unknown): string {
  if (isAuditFieldEmpty(value)) {
    return "—";
  }

  if (field === "role" && typeof value === "string") {
    return ROLE_LABELS[value] ?? value;
  }

  if (field === "status" && typeof value === "string") {
    return STATUS_LABELS[value] ?? value;
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/** Valor em células de diff — vazio fica em branco (sem traço) */
export function formatAuditDiffCell(field: string, value: unknown): string {
  if (isAuditFieldEmpty(value)) return "";
  return formatAuditFieldValue(field, value);
}

export type AuditDiffDisplayMode = "compare" | "create" | "delete";

export function getAuditDiffDisplayMode(
  acao: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): AuditDiffDisplayMode {
  if (acao === "DELETE") return "delete";
  if (isAuditSnapshotOnly(acao, antes, depois)) return "create";
  return "compare";
}

/** Valores vazios não são exibidos em criações/exclusões */
export function isAuditFieldEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return true;
  }
  return false;
}

function pushRowIfMeaningful(
  rows: AuditDiffRow[],
  field: string,
  before: unknown,
  after: unknown,
  mode: "create" | "delete" | "compare",
): void {
  if (AUDIT_METADATA_FIELDS.has(field)) return;

  if (mode === "create" && isAuditFieldEmpty(after)) return;
  if (mode === "delete" && isAuditFieldEmpty(before)) return;
  if (mode === "compare" && isAuditFieldEmpty(before) && isAuditFieldEmpty(after)) return;

  rows.push({
    field,
    label: formatAuditFieldLabel(field),
    before,
    after,
  });
}

export interface AuditDiffRow {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

/** Payload legado de log_auditoria: { entidade_id, detalhes: { ... } } */
function expandAppEventPayload(
  data: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!data) return null;

  const detalhes = data.detalhes;
  if (detalhes && typeof detalhes === "object" && !Array.isArray(detalhes)) {
    return { ...(detalhes as Record<string, unknown>) };
  }

  return data;
}

function isAppEventSnapshot(
  acao: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): boolean {
  if (antes) return false;
  if (!depois) return false;
  if (depois.detalhes != null) return true;
  return !["INSERT", "UPDATE", "DELETE"].includes(acao);
}

export function buildAuditDiffRows(
  acao: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): AuditDiffRow[] {
  const rows: AuditDiffRow[] = [];
  const normalizedAntes = expandAppEventPayload(antes) ?? antes;
  const normalizedDepois = expandAppEventPayload(depois) ?? depois;

  if (isAppEventSnapshot(acao, antes, depois) && normalizedDepois) {
    for (const [field, value] of Object.entries(normalizedDepois)) {
      pushRowIfMeaningful(rows, field, null, value, "create");
    }
    return rows;
  }

  if (acao === "INSERT" && normalizedDepois) {
    for (const [field, value] of Object.entries(normalizedDepois)) {
      pushRowIfMeaningful(rows, field, null, value, "create");
    }
    return rows;
  }

  if (acao === "DELETE" && normalizedAntes) {
    for (const [field, value] of Object.entries(normalizedAntes)) {
      pushRowIfMeaningful(rows, field, value, null, "delete");
    }
    return rows;
  }

  const keys = new Set([
    ...Object.keys(normalizedAntes ?? {}),
    ...Object.keys(normalizedDepois ?? {}),
  ]);

  for (const field of keys) {
    const before = normalizedAntes?.[field];
    const after = normalizedDepois?.[field];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    pushRowIfMeaningful(rows, field, before ?? null, after ?? null, "compare");
  }

  return rows;
}

export function isAuditSnapshotOnly(
  acao: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): boolean {
  return acao === "INSERT" || acao === "DELETE" || isAppEventSnapshot(acao, antes, depois);
}

export type AuditBadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Cor do badge unificada para operações SQL e ações semânticas equivalentes */
export function auditActionBadgeVariant(acao: string): AuditBadgeVariant {
  const normalized = acao.toLowerCase();

  if (
    acao === "INSERT" ||
    normalized.endsWith("_criada") ||
    normalized.endsWith("_criado") ||
    normalized === "usuario_convidado" ||
    normalized.includes("cadastrada")
  ) {
    return "default";
  }

  if (
    acao === "UPDATE" ||
    normalized.endsWith("_atualizada") ||
    normalized.endsWith("_atualizado") ||
    normalized.includes("rotacionada") ||
    normalized === "plano_toggle"
  ) {
    return "secondary";
  }

  if (
    acao === "DELETE" ||
    normalized.endsWith("_excluida") ||
    normalized.endsWith("_excluido") ||
    normalized.includes("removida")
  ) {
    return "destructive";
  }

  return "outline";
}
