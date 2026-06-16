import { format } from "date-fns";
import { AGENTE_COR_OPTIONS, AGENTE_ICON_OPTIONS } from "@/components/agentes-ia/constants";
import type { AgenteIA } from "@/components/agentes-ia/types";

export interface AgenteIaRow {
  id: number;
  empresa_id: number;
  nome: string;
  instrucoes: string;
  icone_url: string | null;
  descricao: string | null;
  is_active: boolean;
  is_popular: boolean;
  cor: string | null;
  created_at: string;
}

export interface AgenteIaInsert {
  empresa_id: number;
  nome: string;
  instrucoes: string;
  descricao: string;
  icone_url: string;
  cor: string;
  is_active: boolean;
  is_popular: boolean;
  created_by?: string;
}

export function mapRowToAgente(row: AgenteIaRow): AgenteIA {
  const iconeId = row.icone_url ?? AGENTE_ICON_OPTIONS[0].id;
  const corId = row.cor ?? AGENTE_COR_OPTIONS[0].id;
  const iconeOpt =
    AGENTE_ICON_OPTIONS.find((i) => i.id === iconeId) ?? AGENTE_ICON_OPTIONS[0];
  const corOpt = AGENTE_COR_OPTIONS.find((c) => c.id === corId) ?? AGENTE_COR_OPTIONS[0];

  return {
    id: String(row.id),
    nome: row.nome,
    descricao: row.descricao ?? "",
    instrucoes: row.instrucoes,
    iconeId: iconeOpt.id,
    corId: corOpt.id,
    icone: iconeOpt.icon,
    corClasse: corOpt.classe,
    is_active: row.is_active,
    is_popular: row.is_popular,
    criadoEm: format(new Date(row.created_at), "dd/MM/yyyy"),
  };
}
