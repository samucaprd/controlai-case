import { format } from "date-fns";
import { getSupabase } from "@/lib/supabase/client";
import type { ChatMessage, ConversaResumo } from "@/features/chat/types";

export interface ConversaRow {
  id: number;
  user_id: string;
  agente_id: number | null;
  titulo: string | null;
  mensagens: unknown;
  updated_at: string;
}

export function mapConversaResumo(row: ConversaRow): ConversaResumo {
  return {
    id: String(row.id),
    userId: row.user_id,
    titulo: row.titulo ?? "Nova conversa",
    agenteId: row.agente_id != null ? String(row.agente_id) : "",
    atualizadoEm: format(new Date(row.updated_at), "dd/MM/yyyy"),
  };
}

export function parseMensagens(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === "object" && "role" in m && "content" in m)
    .map((m) => ({
      role: (m as ChatMessage).role,
      content: String((m as ChatMessage).content),
      created_at: (m as ChatMessage).created_at,
    }))
    .filter((m) => m.role === "user" || m.role === "assistant");
}

export async function listConversas(userId: string): Promise<ConversaResumo[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversas")
    .select("id, user_id, agente_id, titulo, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ConversaRow[]).map(mapConversaResumo);
}

export async function getConversa(id: string): Promise<{
  resumo: ConversaResumo;
  mensagens: ChatMessage[];
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversas")
    .select("id, user_id, agente_id, titulo, mensagens, updated_at")
    .eq("id", Number(id))
    .single();

  if (error || !data) throw new Error(error?.message ?? "Conversa não encontrada");

  const row = data as ConversaRow;
  return {
    resumo: mapConversaResumo(row),
    mensagens: parseMensagens(row.mensagens),
  };
}
