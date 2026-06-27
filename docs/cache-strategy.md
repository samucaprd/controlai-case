# Estratégia de cache — React Query

O projeto usa `@tanstack/react-query` com tempos configurados em `src/lib/query/query-client.ts`.

## Tempos por categoria

| Categoria | `staleTime` | `gcTime` | Uso |
|-----------|-------------|----------|-----|
| **auditLogs** | 30s | 5 min | Aba Logs, Auditoria Master |
| **dashboard** | 60s | 10 min | Métricas do Dashboard |
| **tenant** | 2 min | 15 min | Uso do plano, assinatura |
| **platform** | 3 min | 20 min | Filtros de empresas (master) |

## Query keys (`src/lib/query/cache-keys.ts`)

```ts
queryKeys.auditLogs(filters)      // logs com filtros estáveis
queryKeys.dashboardStats(scope, id)
queryKeys.tenantUsage(empresaId)
queryKeys.masterAudit()
```

## Invalidação

Após ações que alteram dados auditáveis, invalide caches relacionados:

```ts
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/cache-keys";

const qc = useQueryClient();
await qc.invalidateQueries({ queryKey: ["audit-logs"] });
await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats("tenant", empresaId) });
```

Hooks que já invalidam implicitamente via `refetch`:
- Botão **Atualizar** na aba Logs
- `onUserUpdated` após edição de usuários master

## Boas práticas

1. Inclua **todos os filtros** na query key (`auditLogs`).
2. Use `enabled: false` quando Supabase não estiver configurado.
3. Prefira RPCs agregadas em vez de múltiplos `useEffect` + `fetch`.
4. Debounce de 350ms em buscas de texto (aba Logs).

## Provider

`App.tsx` usa `createQueryClient()` com retry=1 e `refetchOnWindowFocus: true`.
