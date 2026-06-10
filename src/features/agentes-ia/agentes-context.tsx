import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgenteIA } from "@/components/agentes-ia/types";
import {
  createAgenteIa,
  deleteAgenteIa,
  listAgentesIa,
  updateAgenteIa,
  type AgenteIaPayload,
} from "@/lib/api/agentes-ia";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useSession } from "@/features/auth/session-context";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";

interface AgentesContextValue {
  agentes: AgenteIA[];
  agentesAtivos: AgenteIA[];
  agentesPopulares: AgenteIA[];
  isLoading: boolean;
  maxAgentes: number;
  canCreateMore: boolean;
  refresh: () => Promise<void>;
  createAgente: (payload: AgenteIaPayload) => Promise<AgenteIA>;
  updateAgente: (
    id: string,
    patch: Partial<AgenteIaPayload>,
  ) => Promise<void>;
  deleteAgente: (id: string) => Promise<void>;
}

const AgentesContext = createContext<AgentesContextValue | undefined>(undefined);

export function AgentesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const useSupabase = isSupabaseConfigured();
  const { info } = useTenantSubscription();
  const [agentes, setAgentes] = useState<AgenteIA[]>([]);
  const [isLoading, setIsLoading] = useState(useSupabase);

  const maxAgentes = info?.maxAgentes ?? 0;
  const canCreateMore = agentes.length < maxAgentes;

  const fetchAgentes = useCallback(async () => {
    if (!useSupabase || !user?.empresaId) {
      setAgentes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await listAgentesIa(Number(user.empresaId));
      setAgentes(rows);
    } catch (err) {
      console.error("[agentes]", err);
      setAgentes([]);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase, user?.empresaId]);

  useEffect(() => {
    void fetchAgentes();
  }, [fetchAgentes]);

  const createAgente = useCallback(
    async (payload: AgenteIaPayload) => {
      if (!user?.empresaId) throw new Error("Empresa não identificada.");
      if (agentes.length >= maxAgentes) {
        throw new Error(
          `Limite do plano atingido: máximo ${maxAgentes} agente(s).`,
        );
      }
      const created = await createAgenteIa(
        Number(user.empresaId),
        payload,
        user.id,
      );
      setAgentes((prev) => [created, ...prev]);
      return created;
    },
    [agentes.length, maxAgentes, user?.empresaId, user?.id],
  );

  const updateAgente = useCallback(
    async (id: string, patch: Partial<AgenteIaPayload>) => {
      const updated = await updateAgenteIa(id, patch);
      setAgentes((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    [],
  );

  const deleteAgente = useCallback(async (id: string) => {
    await deleteAgenteIa(id);
    setAgentes((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const agentesAtivos = useMemo(
    () => agentes.filter((a) => a.is_active),
    [agentes],
  );

  const agentesPopulares = useMemo(
    () => agentes.filter((a) => a.is_active && a.is_popular),
    [agentes],
  );

  const value = useMemo(
    () => ({
      agentes,
      agentesAtivos,
      agentesPopulares,
      isLoading,
      maxAgentes,
      canCreateMore,
      refresh: fetchAgentes,
      createAgente,
      updateAgente,
      deleteAgente,
    }),
    [
      agentes,
      agentesAtivos,
      agentesPopulares,
      isLoading,
      maxAgentes,
      canCreateMore,
      fetchAgentes,
      createAgente,
      updateAgente,
      deleteAgente,
    ],
  );

  return (
    <AgentesContext.Provider value={value}>{children}</AgentesContext.Provider>
  );
}

export function useAgentes() {
  const ctx = useContext(AgentesContext);
  if (!ctx) {
    throw new Error("useAgentes deve ser usado dentro de AgentesProvider");
  }
  return ctx;
}
