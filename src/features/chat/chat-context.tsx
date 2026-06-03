import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import { useSession } from "@/features/auth/session-context";
import { mockConversas } from "./mock-conversas";
import type { ChatContextValue, ChatUser } from "./types";

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { agentesAtivos, agentesPopulares } = useAgentes();
  const { user: session } = useSession();
  const user: ChatUser = useMemo(
    () => ({
      id: session.id,
      nome: session.nome,
      empresaNome: session.empresaNome,
    }),
    [session.id, session.nome, session.empresaNome],
  );
  const [selectedAgenteId, setSelectedAgenteId] = useState<string | null>(null);
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);

  const agentes = agentesAtivos;

  const conversas = useMemo(
    () => mockConversas.filter((c) => c.userId === user.id),
    [user.id],
  );

  const setSelectedAgenteIdStable = useCallback((id: string | null) => {
    setSelectedAgenteId(id);
  }, []);

  const setSelectedConversaIdStable = useCallback((id: string | null) => {
    setSelectedConversaId(id);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      user,
      conversas,
      agentes,
      agentesPopulares,
      selectedAgenteId,
      selectedConversaId,
      setSelectedAgenteId: setSelectedAgenteIdStable,
      setSelectedConversaId: setSelectedConversaIdStable,
    }),
    [
      user,
      conversas,
      agentes,
      agentesPopulares,
      selectedAgenteId,
      selectedConversaId,
      setSelectedAgenteIdStable,
      setSelectedConversaIdStable,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat deve ser usado dentro de ChatProvider");
  }
  return ctx;
}

