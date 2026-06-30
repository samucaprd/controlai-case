/**
 * Expande termos de busca em português/inglês para o formato gravado no banco.
 * Usado antes de chamar list_audit_logs (complementa a lógica SQL).
 */
export function expandAuditSearchTerms(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  const terms = new Set<string>([raw.trim()]);

  const opSynonyms: Record<string, string[]> = {
    insert: ["INSERT", "insert", "create", "criar", "criado", "criada", "inserir"],
    update: ["UPDATE", "update", "atualizar", "atualizado", "atualizada", "editar", "editado"],
    delete: ["DELETE", "delete", "excluir", "excluído", "excluido", "excluída", "excluida", "remover"],
  };

  for (const [op, words] of Object.entries(opSynonyms)) {
    if (words.some((w) => w.toLowerCase() === q || q.includes(w.toLowerCase()))) {
      if (op === "insert") terms.add("INSERT");
      if (op === "update") terms.add("UPDATE");
      if (op === "delete") terms.add("DELETE");
    }
  }

  if (q.includes("usuário") || q.includes("usuario")) {
    terms.add("perfis");
    terms.add("perfil");
  }
  if (q.includes("empresa")) terms.add("empresas");
  if (q.includes("agente")) terms.add("agentes_ia");
  if (q.includes("plano")) terms.add("planos");

  return [...terms];
}
