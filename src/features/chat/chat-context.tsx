import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { useSession } from "@/features/auth/session-context";
import { sendChatMessage, ChatCompletionError } from "@/lib/api/chat-completion";
import { getConversa, listConversas } from "@/lib/api/conversas";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { ChatContextValue, ChatMessage, ChatUser, ConversaResumo } from "./types";
import { toast } from "sonner";

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { agentesAtivos, agentesPopulares } = useAgentes();
  const { info } = useTenantSubscription();
  const { user: session } = useSession();
  const useSupabase = isSupabaseConfigured();

  const user: ChatUser = useMemo(
    () => ({
      id: session.id,
      nome: session.nome,
      empresaNome: session.empresaNome,
    }),
    [session.id, session.nome, session.empresaNome],
  );

  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedAgenteId, setSelectedAgenteId] = useState<string | null>(null);
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [isLoadingConversas, setIsLoadingConversas] = useState(useSupabase);
  const [isSending, setIsSending] = useState(false);
  const [usage, setUsage] = useState<ChatContextValue["usage"]>(null);

  const byokReady = Boolean(
    info?.byokEnabled && info?.chaveApiConfigurada,
  );

  const agentes = agentesAtivos;

  const refreshConversas = useCallback(async () => {
    if (!useSupabase || !user.id) {
      setConversas([]);
      setIsLoadingConversas(false);
      return;
    }

    setIsLoadingConversas(true);
    try {
      const rows = await listConversas(user.id);
      setConversas(rows);
    } catch (err) {
      console.error("[chat] list conversas", err);
      setConversas([]);
    } finally {
      setIsLoadingConversas(false);
    }
  }, [useSupabase, user.id]);

  useEffect(() => {
    void refreshConversas();
  }, [refreshConversas]);

  useEffect(() => {
    if (!selectedConversaId || !useSupabase) {
      if (!selectedConversaId) setMessages([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { resumo, mensagens } = await getConversa(selectedConversaId);
        if (cancelled) return;
        setMessages(mensagens);
        if (resumo.agenteId) setSelectedAgenteId(resumo.agenteId);
      } catch (err) {
        console.error("[chat] load conversa", err);
        if (!cancelled) toast.error("Não foi possível carregar a conversa.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedConversaId, useSupabase]);

  const startNewConversation = useCallback(() => {
    setSelectedConversaId(null);
    setSelectedAgenteId(null);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (!byokReady) {
        toast.error("BYOK não configurado. Peça ao administrador para cadastrar a chave API.");
        return;
      }

      if (!selectedAgenteId) {
        toast.message("Selecione um agente antes de enviar.");
        return;
      }

      setIsSending(true);
      try {
        const result = await sendChatMessage({
          message: trimmed,
          agente_id: Number(selectedAgenteId),
          conversa_id: selectedConversaId ? Number(selectedConversaId) : null,
        });

        setMessages(result.mensagens);
        setSelectedConversaId(String(result.conversa_id));
        setUsage(result.usage);
        await refreshConversas();
      } catch (err) {
        if (err instanceof ChatCompletionError) {
          if (err.usage) setUsage(err.usage);
          toast.error(err.message);
        } else {
          toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
        }
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [byokReady, selectedAgenteId, selectedConversaId, refreshConversas],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      user,
      conversas,
      agentes,
      agentesPopulares,
      messages,
      selectedAgenteId,
      selectedConversaId,
      isLoadingConversas,
      isSending,
      usage,
      byokReady,
      setSelectedAgenteId,
      setSelectedConversaId,
      sendMessage,
      startNewConversation,
      refreshConversas,
    }),
    [
      user,
      conversas,
      agentes,
      agentesPopulares,
      messages,
      selectedAgenteId,
      selectedConversaId,
      isLoadingConversas,
      isSending,
      usage,
      byokReady,
      sendMessage,
      startNewConversation,
      refreshConversas,
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
