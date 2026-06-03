import type { LucideIcon } from "lucide-react";

export interface AgenteIA {
  id: string;
  nome: string;
  /** Descrição curta exibida no card */
  descricao: string;
  /** Instruções / system prompt do agente */
  instrucoes: string;
  iconeId: string;
  corId: string;
  icone: LucideIcon;
  corClasse: string;
  is_active: boolean;
  is_popular: boolean;
  criadoEm: string;
}

export type AgenteFormMode = "create" | "edit";
