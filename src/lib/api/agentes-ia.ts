import { getSupabase } from "@/lib/supabase/client";
import {
  mapRowToAgente,
  type AgenteIaInsert,
  type AgenteIaRow,
} from "@/lib/agentes-ia/map-agente";
import type { AgenteIA } from "@/components/agentes-ia/types";

export interface AgenteIaPayload {
  nome: string;
  descricao: string;
  instrucoes: string;
  iconeId: string;
  corId: string;
  is_active: boolean;
  is_popular: boolean;
}

function toInsert(
  empresaId: number,
  payload: AgenteIaPayload,
  createdBy?: string,
): AgenteIaInsert {
  return {
    empresa_id: empresaId,
    nome: payload.nome.trim(),
    descricao: payload.descricao.trim(),
    instrucoes: payload.instrucoes.trim(),
    icone_url: payload.iconeId,
    cor: payload.corId,
    is_active: payload.is_active,
    is_popular: payload.is_popular && payload.is_active,
    ...(createdBy ? { created_by: createdBy } : {}),
  };
}

function parseAgenteLimitError(message: string): string | null {
  if (message.includes("Limite de agentes do plano")) {
    const match = message.match(/máximo (\d+)/);
    return match
      ? `Limite do plano atingido: máximo ${match[1]} agente(s). Faça upgrade para cadastrar mais.`
      : "Limite de agentes do plano atingido.";
  }
  return null;
}

export async function listAgentesIa(empresaId: number): Promise<AgenteIA[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agentes_ia")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as AgenteIaRow[]).map(mapRowToAgente);
}

export async function createAgenteIa(
  empresaId: number,
  payload: AgenteIaPayload,
  createdBy?: string,
): Promise<AgenteIA> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agentes_ia")
    .insert(toInsert(empresaId, payload, createdBy))
    .select("*")
    .single();

  if (error) {
    const limitMsg = parseAgenteLimitError(error.message);
    throw new Error(limitMsg ?? error.message);
  }

  return mapRowToAgente(data as AgenteIaRow);
}

export async function updateAgenteIa(
  id: string,
  payload: Partial<AgenteIaPayload>,
): Promise<AgenteIA> {
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};

  if (payload.nome !== undefined) patch.nome = payload.nome.trim();
  if (payload.descricao !== undefined) patch.descricao = payload.descricao.trim();
  if (payload.instrucoes !== undefined) patch.instrucoes = payload.instrucoes.trim();
  if (payload.iconeId !== undefined) patch.icone_url = payload.iconeId;
  if (payload.corId !== undefined) patch.cor = payload.corId;
  if (payload.is_active !== undefined) patch.is_active = payload.is_active;
  if (payload.is_popular !== undefined) patch.is_popular = payload.is_popular;
  if (payload.is_active === false) patch.is_popular = false;

  const { data, error } = await supabase
    .from("agentes_ia")
    .update(patch)
    .eq("id", Number(id))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRowToAgente(data as AgenteIaRow);
}

export async function deleteAgenteIa(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("agentes_ia").delete().eq("id", Number(id));
  if (error) throw new Error(error.message);
}
