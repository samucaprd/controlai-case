import type { AgenteIA } from "@/components/agentes-ia/types";

export interface ChatUser {
  id: string;
  nome: string;
  empresaNome: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

export interface ConversaResumo {
  id: string;
  userId: string;
  titulo: string;
  agenteId: string;
  atualizadoEm: string;
}

export interface ChatUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface ChatContextValue {
  user: ChatUser;
  conversas: ConversaResumo[];
  agentes: AgenteIA[];
  agentesPopulares: AgenteIA[];
  messages: ChatMessage[];
  selectedAgenteId: string | null;
  selectedConversaId: string | null;
  isLoadingConversas: boolean;
  isSending: boolean;
  usage: ChatUsage | null;
  byokReady: boolean;
  setSelectedAgenteId: (id: string | null) => void;
  setSelectedConversaId: (id: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: () => void;
  refreshConversas: () => Promise<void>;
}
