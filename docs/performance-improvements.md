# Melhorias de performance — Épico 7

Documentação das otimizações de banco, API e frontend implementadas na **Fase 7** (auditoria e observabilidade).

## Índices compostos

Migration principal: `022_epic7_audit_logs_rls_performance`  
Complementos: `024` (busca), `026` (filtros user/ação), `027` (aliases de tabela)

### `audit_logs` (consultas da aba Logs)

| Índice | Colunas | Quando é aproveitado |
|--------|---------|----------------------|
| `idx_audit_logs_empresa_created` | `(empresa_id, created_at DESC)` | Filtro por empresa (admin tenant ou master) |
| `idx_audit_logs_tabela_created` | `(tabela, created_at DESC)` | Filtro por tabela/entidade |
| `idx_audit_logs_user_created` | `(user_id, created_at DESC)` | Filtro por usuário autor |
| `idx_audit_logs_created` | `(created_at DESC)` | Listagem global / sem filtros de dimensão |

O painel **Épico 7 — Performance & cache** na aba Admin → Logs indica quais índices se alinham aos filtros ativos.

### Demais tabelas (dashboard e master)

| Índice | Tabela | Colunas | Objetivo |
|--------|--------|---------|----------|
| `idx_perfis_empresa_status` | `perfis` | `(empresa_id, status)` | Contagem de colaboradores ativos |
| `idx_conversas_empresa_updated` | `conversas` | `(empresa_id, updated_at DESC)` | Conversas recentes |
| `idx_auditoria_empresa_created` | `auditoria` | `(empresa_id, created_at DESC)` | Legado `auditoria` |
| `idx_agentes_empresa_active` | `agentes_ia` | `(empresa_id, is_active)` | Agentes ativos / BYOK |
| `idx_uso_recursos_empresa_mes` | `uso_recursos` | `(empresa_id, mes_referencia DESC)` | Limites do plano |
| `idx_empresas_status_active` | `empresas` | `(status, is_active)` | Métricas master |

## Eliminação de N+1

### Antes
- `auditoria` consultada com joins aninhados (`perfis`, `empresas`) no client Supabase.
- Múltiplas round-trips em listagens grandes.

### Depois
- RPC **`list_audit_logs`** — um único `JOIN` server-side (`audit_logs` + `perfis` + `empresas`).
- Filtros `p_user_id`, `p_acao`, `p_tabela`, `p_empresa_id` e busca textual na mesma chamada.
- Funções auxiliares: `audit_log_matches_search`, `normalize_audit_table`, `list_audit_log_users`.

### Onde é usada
- Aba **Logs** (Admin)
- **Auditoria** (Master)
- **Atividade recente** (Dashboard)

## Sanitização em logs

Triggers removem campos sensíveis antes de persistir:
- `empresas.chave_api_llm`
- `conversas.mensagens` (payload grande)

## Frontend — cache e debounce

Ver também [cache-strategy.md](./cache-strategy.md).

| Técnica | Implementação | Benefício |
|---------|---------------|-----------|
| React Query | `CACHE_TIMES.auditLogs` (30s stale / 5min gc) | Reuso ao voltar à aba Logs |
| Query keys estáveis | `queryKeys.auditLogs(filters)` | Cache por combinação de filtros |
| Debounce | 350ms em `use-audit-logs` | Menos RPCs durante digitação |
| Filtros em cache | `use-audit-empresas-filter`, `use-audit-users-filter` | Dropdowns sem refetch constante |

## Próximos passos (opcional)

- Paginação cursor-based em `list_audit_logs` para alto volume.
- Materialized view para métricas do dashboard acima de ~100k conversas.
- `EXPLAIN ANALYZE` periódico nos filtros mais usados em produção.
