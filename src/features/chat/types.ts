import type { AgenteIA } from "@/components/agentes-ia/types";

export interface ChatUser {
  id: string;
  nome: string;
  empresaNome: string;
}

export interface ConversaResumo {
  id: string;
  userId: string;
  titulo: string;
  agenteId: string;
  atualizadoEm: string;
}

export interface ChatContextValue {
  user: ChatUser;
  conversas: ConversaResumo[];
  agentes: AgenteIA[];
  agentesPopulares: AgenteIA[];
  selectedAgenteId: string | null;
  selectedConversaId: string | null;
  setSelectedAgenteId: (id: string | null) => void;
  setSelectedConversaId: (id: string | null) => void;
}
