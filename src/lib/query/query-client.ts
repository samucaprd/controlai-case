import { QueryClient } from "@tanstack/react-query";

/** Tempos de cache por categoria de dado (US7.3). */
export const CACHE_TIMES = {
  /** Logs e auditoria — dados voláteis */
  auditLogs: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  },
  /** Dashboard e métricas agregadas */
  dashboard: {
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  },
  /** Uso do tenant / assinatura */
  tenant: {
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  },
  /** Listagens master (empresas, planos) */
  platform: {
    staleTime: 3 * 60_000,
    gcTime: 20 * 60_000,
  },
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_TIMES.dashboard.staleTime,
        gcTime: CACHE_TIMES.dashboard.gcTime,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}
