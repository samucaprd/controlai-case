# Checklist de Go-Live — ControlAI

Use este checklist antes de colocar a plataforma em produção.

## 1. Segredos e rotação de chaves

- [ ] Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se já foi exposta em ambiente de dev
- [ ] Rotacionar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` após testes em modo test
- [ ] Configurar `BREVO_API_KEY` e `BREVO_SENDER_EMAIL` nas Edge Functions
- [ ] Configurar `BYOK_ENCRYPTION_KEY` (32+ bytes) para criptografia de chaves LLM
- [ ] Confirmar que `.env.local` **não** está no repositório
- [ ] Vite: apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend

## 2. Supabase

- [ ] Aplicar todas as migrations (`022` a `027` — auditoria, busca, filtros, aliases)
- [ ] Deploy das Edge Functions críticas:
  - `invite-tenant-user`, `delete-tenant-user`
  - `chat-completion`, `manage-byok-key`
  - `create-checkout-session`, `manage-subscription`, `stripe-webhook`, `sync-checkout-session`
- [ ] Redirect URLs Auth: produção + `http://localhost:3000/auth/accept-invite`
- [ ] Webhook Stripe apontando para `.../functions/v1/stripe-webhook`
- [ ] RLS ativo em todas as tabelas tenant (`audit_logs`, `perfis`, `empresas`, etc.)

## 3. Stripe

- [ ] Produtos/preços sincronizados (Master sem checkout automático)
- [ ] Portal de cobrança habilitado no Dashboard Stripe
- [ ] Testar fluxo: Free → Básico → cancelamento ao fim do período → Free

## 4. Monitoramento inicial (primeiras 72h)

- [ ] Acompanhar aba **Logs** (Admin) e **Auditoria** (Master) por ações inesperadas
- [ ] Verificar logs das Edge Functions no Supabase Dashboard
- [ ] Monitorar falhas de webhook Stripe (eventos duplicados são ignorados via `stripe_webhook_events`)
- [ ] Conferir taxa de erro no chat (Dashboard → Taxa de Sucesso)

## 5. Comunicação ao time

- [ ] Informar admins de tenant sobre aba **Logs** e escopo por empresa
- [ ] Documentar que Master vê logs de **toda a plataforma**
- [ ] Definir responsável por revisão semanal de auditoria
- [ ] Canal de suporte para convites / reset de senha

## 6. Plano de rollback

| Componente | Rollback |
|------------|----------|
| Frontend | Reverter deploy Vite para build anterior |
| Migrations | **Não** reverter em produção sem backup; migrations são forward-only |
| Edge Functions | `supabase functions deploy <nome> --project-ref <ref>` com versão anterior do git |
| Stripe | Manter webhook ativo; desativar novos checkouts se necessário |
| Dados | Backup PITR Supabase antes do go-live |

### Procedimento rápido

1. Identificar incidente (logs, Stripe, auth)
2. Reverter frontend se bug for só UI
3. Redeploy da Edge Function afetada com tag git estável
4. Se corrupção de dados: restaurar snapshot Supabase (último recurso)
5. Comunicar tenants afetados com prazo de normalização

## 7. Smoke tests pós-deploy

```bash
pnpm smoke:supabase
pnpm smoke:byok
pnpm smoke:agentes
```

- [ ] Login admin + colaborador
- [ ] Convidar usuário + aceitar convite
- [ ] Enviar mensagem no chat com BYOK configurado
- [ ] Upgrade de plano (sandbox Stripe)
- [ ] Verificar entrada em **Logs** após alteração de usuário

## 8. Compliance

- [ ] Logs não expõem `chave_api_llm` nem conteúdo de `conversas.mensagens`
- [ ] Admins de tenant não acessam dados de outras empresas (validar RLS)
- [ ] Retenção de logs: definir política (ex.: 12 meses) conforme LGPD

---

**Projeto Supabase:** `hrzsdiduafuqtxitpgoy`  
**Última atualização:** Épico 7 — auditoria, RLS e performance
