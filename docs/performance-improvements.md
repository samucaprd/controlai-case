# Melhorias de performance — Épico 7

## Índices compostos (migration `022_epic7_audit_logs_rls_performance`)

| Índice | Tabela | Colunas | Objetivo |
|--------|--------|---------|----------|
| `idx_audit_logs_empresa_created` | `audit_logs` | `(empresa_id, created_at DESC)` | Logs por tenant |
| `idx_audit_logs_tabela_created` | `audit_logs` | `(tabela, created_at DESC)` | Filtro por entidade |
| `idx_audit_logs_user_created` | `audit_logs` | `(user_id, created_at DESC)` | Rastreio por usuário |
| `idx_perfis_empresa_status` | `perfis` | `(empresa_id, status)` | Contagem de ativos |
| `idx_conversas_empresa_updated` | `conversas` | `(empresa_id, updated_at DESC)` | Listagem recente |
| `idx_auditoria_empresa_created` | `auditoria` | `(empresa_id, created_at DESC)` | Legado auditoria |
| `idx_agentes_empresa_active` | `agentes_ia` | `(empresa_id, is_active)` | Status BYOK/dashboard |
| `idx_uso_recursos_empresa_mes` | `uso_recursos` | `(empresa_id, mes_referencia DESC)` | Limites do plano |
| `idx_empresas_status_active` | `empresas` | `(status, is_active)` | Métricas master |
| `idx_audit_logs_created` | `audit_logs` | `(created_at DESC)` | Feed global |

## Eliminação de N+1

### Antes
- `auditoria` era consultada com joins aninhados (`perfis`, `empresas`) no client Supabase, gerando múltiplas round-trips em listagens grandes.

### Depois
- RPC `list_audit_logs` executa **um único JOIN** server-side (`audit_logs` + `perfis` + `empresas`).
- Usada em: aba **Logs** (Admin), **Auditoria** (Master) e **Atividade Recente** (Dashboard).

## Sanitização em logs

Triggers removem campos sensíveis antes de persistir:
- `empresas.chave_api_llm`
- `conversas.mensagens` (payload grande)

## Próximos passos (opcional)

- Paginação cursor-based em `list_audit_logs` para tenants com alto volume.
- Materialized view para métricas do dashboard se o volume crescer acima de 100k conversas.
