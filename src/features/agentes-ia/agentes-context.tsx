import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockAgentesIA } from "@/components/agentes-ia/mock-agentes";
import type { AgenteIA } from "@/components/agentes-ia/types";

const AGENTES_OVERRIDES_KEY = "controlia_agentes_overrides";

type AgenteOverrides = Record<
  string,
  { is_active?: boolean; is_popular?: boolean }
>;

function loadOverrides(): AgenteOverrides {
  try {
    const raw = localStorage.getItem(AGENTES_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AgenteOverrides;
  } catch {
    return {};
  }
}

function applyOverrides(agentes: AgenteIA[], overrides: AgenteOverrides): AgenteIA[] {
  return agentes.map((agente) => {
    const patch = overrides[agente.id];
    if (!patch) return agente;
    const is_active = patch.is_active ?? agente.is_active;
    const is_popular =
      patch.is_popular !== undefined
        ? patch.is_popular && is_active
        : agente.is_popular && is_active;
    return { ...agente, is_active, is_popular };
  });
}

function mergeAgentes(): AgenteIA[] {
  return applyOverrides(mockAgentesIA, loadOverrides());
}

interface AgentesContextValue {
  agentes: AgenteIA[];
  agentesAtivos: AgenteIA[];
  agentesPopulares: AgenteIA[];
  updateAgente: (
    id: string,
    patch: Partial<Pick<AgenteIA, "is_active" | "is_popular">>,
  ) => void;
}

const AgentesContext = createContext<AgentesContextValue | undefined>(undefined);

export function AgentesProvider({ children }: { children: ReactNode }) {
  const [agentes, setAgentes] = useState<AgenteIA[]>(mergeAgentes);

  const persist = useCallback((next: AgenteIA[]) => {
    const overrides: AgenteOverrides = {};
    for (const a of next) {
      const base = mockAgentesIA.find((m) => m.id === a.id);
      if (!base) continue;
      if (a.is_active !== base.is_active || a.is_popular !== base.is_popular) {
        overrides[a.id] = {
          is_active: a.is_active,
          is_popular: a.is_popular,
        };
      }
    }
    localStorage.setItem(AGENTES_OVERRIDES_KEY, JSON.stringify(overrides));
  }, []);

  const updateAgente = useCallback(
    (id: string, patch: Partial<Pick<AgenteIA, "is_active" | "is_popular">>) => {
      setAgentes((prev) => {
        const next = prev.map((agente) => {
          if (agente.id !== id) return agente;
          const is_active = patch.is_active ?? agente.is_active;
          let is_popular = patch.is_popular ?? agente.is_popular;
          if (!is_active) is_popular = false;
          return { ...agente, is_active, is_popular };
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

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
      updateAgente,
    }),
    [agentes, agentesAtivos, agentesPopulares, updateAgente],
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
