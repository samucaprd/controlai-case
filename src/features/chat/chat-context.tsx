import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import { mockConversas } from "./mock-conversas";
import type { ChatContextValue, ChatUser } from "./types";
import { CHAT_USER_STORAGE_KEY } from "./types";

const defaultUser: ChatUser = {
  id: "user-demo",
  nome: "Usuário",
  empresaNome: "Sua Empresa",
};

function loadUser(): ChatUser {
  try {
    const raw = localStorage.getItem(CHAT_USER_STORAGE_KEY);
    if (!raw) return defaultUser;
    return { ...defaultUser, ...JSON.parse(raw) } as ChatUser;
  } catch {
    return defaultUser;
  }
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { agentesAtivos, agentesPopulares } = useAgentes();
  const [user] = useState<ChatUser>(loadUser);
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

export function persistChatUser(user: ChatUser) {
  localStorage.setItem(CHAT_USER_STORAGE_KEY, JSON.stringify(user));
}
