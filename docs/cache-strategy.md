# Estratégia de cache — React Query (Épico 7)

O projeto usa `@tanstack/react-query` com tempos centralizados em `src/lib/query/query-client.ts` (US7.3).

## Tempos por categoria

| Categoria | `staleTime` | `gcTime` | Uso |
|-----------|-------------|----------|-----|
| **auditLogs** | 30s | 5 min | Aba Logs, filtros de usuário, Auditoria Master |
| **dashboard** | 60s | 10 min | Métricas do Dashboard |
| **tenant** | 2 min | 15 min | Uso do plano, assinatura |
| **platform** | 3 min | 20 min | Filtro de empresas (master) |

### Comportamento prático (auditLogs)

1. Primeira abertura da aba **Logs** → 1 RPC `list_audit_logs`.
2. Trocar filtro → nova query key → nova RPC (cache separado por filtros).
3. Voltar aos mesmos filtros em até **30s** → dados servidos do cache (badge *Em cache* no painel Épico 7).
4. Após 30s → `isStale`; refetch ao focar a janela ou ao clicar **Atualizar**.
5. Após 5 min sem uso → garbage collection remove a entrada.

## Query keys (`src/lib/query/cache-keys.ts`)

```ts
queryKeys.auditLogs(filters)      // todos os filtros: empresa, tabela, user, ação, busca
queryKeys.dashboardStats(scope, id)
queryKeys.tenantUsage(empresaId)
queryKeys.masterAudit()
```

Chaves auxiliares:
- `["audit-empresas-filter"]` — empresas no dropdown (master)
- `["audit-users-filter", empresaId]` — usuários com logs

## Invalidação

Após ações que alteram dados auditáveis:

```ts
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/cache-keys";

const qc = useQueryClient();
await qc.invalidateQueries({ queryKey: ["audit-logs"] });
await qc.invalidateQueries({ queryKey: ["audit-users-filter"] });
await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats("tenant", empresaId) });
```

Hooks que já invalidam ou atualizam cache:
- Botão **Atualizar** na aba Logs (`refetch`)
- Exclusão de log (`invalidateQueries` em `audit-logs` e `audit-users-filter`)
- Edição de usuários master (dashboard / auditoria)

## UI — painel de performance

Na aba **Admin → Logs**, o componente `AdminLogsPerformancePanel` exibe:
- Status do cache (*Em cache · há Xs* / *Atualizando…*)
- Índices Postgres alinhados aos filtros ativos
- Resumo das otimizações do Épico 7 (RPC única, índices, debounce)

Código: `src/components/admin/admin-logs-performance-panel.tsx`  
Lógica: `src/features/audit/performance-hints.ts`

## Boas práticas

1. Inclua **todos os filtros** na query key (`auditLogs`).
2. Use `enabled: false` quando Supabase não estiver configurado.
3. Prefira RPCs agregadas em vez de múltiplos `useEffect` + `fetch`.
4. Debounce de **350ms** em buscas de texto (aba Logs).
5. Não reduza `staleTime` de logs sem necessidade — aumenta carga no Postgres.

## Provider

`App.tsx` usa `createQueryClient()` com `retry: 1` e `refetchOnWindowFocus: true`.

## Relacionado

- Índices e RPC: [performance-improvements.md](./performance-improvements.md)
- Checklist go-live: [release-checklist.md](./release-checklist.md)
