# **Documento de Requisitos do Produto (PRD) – Versão Final**

**Nome do Projeto:** **ControlAI**

## **1. Visão Geral (Overview)**

O projeto é a construção de uma Plataforma de Inteligência Artificial Privada (**SaaS Multi-tenant**), denominada **ControlAI**, para ser o MVP (Produto Mínimo Viável) do curso "Do 0 ao App".

Esta plataforma permitirá que **empresas (Tenants)** se inscrevam, gerenciem seus colaboradores e utilizem modelos de LLM (como OpenAI/Claude) sob um contexto seguro e privado.

**Pilares do Produto:**

- **Segurança Multi-tenant (RLS):** Garantia de segregação estrita de dados entre empresas.
- **Modelo de Assinatura Híbrido (BYOK - Bring Your Own Key):** A plataforma cobra uma taxa de serviço (Plataforma + Segurança), enquanto a empresa cliente fornece e gerencia seus próprios custos de token de LLM.
- **Gestão Completa:** Incluindo painéis de controle separados para o Admin Master da Plataforma (o Dono) e para os Administradores de cada Empresa (Admin Tenant).

## **2. Metas**

- Implementar Multi-tenancy Segura: Garantir a segregação estrita de dados entre tenants usando Row-Level Security (RLS) do Supabase.
- Monetização BYOK: Implementar o Stripe para a Taxa de Plataforma SaaS, exigindo que o cliente insira sua própria Chave API de LLM para liberar o recurso.
- Gestão de Plataforma Master: Criar um Dashboard dedicado para o Admin Master (Dono) para auditoria e monitoramento do negócio SaaS.
- Foco na Conversão: Criar uma Landing Page e uma Página de Vendas/Pricing robustas para otimizar a aquisição de clientes.
- Segurança de Dados: Garantir criptografia de dados sensíveis (chaves API) e conformidade com boas práticas de segurança.
- Comunicação Automatizada: Implementar e-mails transacionais para eventos importantes (boas-vindas, alertas, etc).

## **3. Stack Tecnológica e Integrações**

- **Framework:** **React & Vite** (Base do Protótipo Lovable).
- **Roteamento:** **React Router DOM** (Roteamento Client-Side).
- **Desenvolvimento:** Cursor e VSCode.
- **Banco de Dados:** Supabase (PostgreSQL, Auth, RLS, Storage).
- **Pagamentos:** Stripe (Assinaturas SaaS, Webhooks).
- **E-mails:** Brevo (E-mails Transacionais).
- **IA/LLM:** OpenAI/Claude (Via Chave BYOK) e AI SDK.
- **Hosting/CI/CD:** Netlify(Configurado para Build Vite).
- **UI/Design:** Shadcn UI.

## **4. Páginas e Funcionalidades Essenciais**

- **Landing Page / Página de Vendas:** Apresentação do SaaS e Pricing. CTA de conversão (link para Stripe Checkout).
- **Auth (Login/Cadastro):** Permite cadastro de novas empresas (criação de Tenant) e login seguro.
- **Dashboard do Colaborador:** Página de usuário. Acesso liberado por Assinatura Ativa + Chave BYOK Válida.
- **Página de Chat (Protegida/LLM):** Interface principal de interação com a LLM. Injeta o contexto_ia configurado pela empresa.
- **Admin Dashboard (Tenant/Empresa):** Acesso restrito ao role: admin. Funções: 1) Inserir Chave API (BYOK), 2) Configurar Contexto da IA (System Prompt), 3) Gerenciar Colaboradores (CRUD).
- **Dashboard Master (Plataforma):** Acesso restrito ao role: master. Funções: Monitoramento de Assinaturas (Stripe), Visão Geral de Todas as Empresas (Tenants), Auditoria de Logs e Uso.
- **Módulo de Faturamento:** Link para o Portal do Cliente do Stripe para gerenciamento de planos e dados de pagamento.
- **Gerenciamento de Agentes IA (Admin Tenant):** CRUD completo de Agentes IA customizados. Configuração de *system prompts* específicos.
- **Seleção de Agentes (Colaborador):** Interface para escolha do agente antes de iniciar conversa.
- **Controle de Limites de Uso:** Sistema de *tracking* automático de uso (mensagens, tokens, agentes) por tenant. Validação contra limites do plano.
- **Sistema de Auditoria:** Log detalhado de todas as ações administrativas (master e admin).

---

## **5. Modelo de Dados (Data Model)**

**Convenções:** Todas as chaves primárias (id) são do tipo int8 (Bigint - Autonumeração). Timestamps: TIMESTAMPTZ.

### **Tabela: planos**

- id: int8 (PK)
- nome: String ('Free', 'Básico', 'Empresa', 'Master')
- preco_mensal: Decimal(10,2)
- max_usuarios: Integer
- max_agentes: Integer
- limite_mensagens_mes: Integer
- stripe_price_id: String (UNIQUE)
- *Demais campos:* features, is_active, cor, created_at, updated_at.

### **Tabela: empresas (Tenants)**

- id: int8 (PK)
- nome: String (NOT NULL)
- plano_id: int8 (FK → planos)
- chave_api_llm: String (ENCRYPTED)
- contexto_ia: JSONB
- stripe_customer_id: String (UNIQUE)
- *Demais campos:* email, telefone, endereco, status, data_adesao, proxima_cobranca, is_active, created_at, updated_at.

### **Tabela: perfis (Colaboradores/Usuários)**

- id: int8 (PK, FK → auth.users)
- empresa_id: int8 (FK → empresas - ESSENCIAL para RLS)
- role: Enum (master, admin, user)
- *Demais campos:* email, nome_completo, telefone, cargo, status, ultimo_acesso, avatar_url, created_at, updated_at.

### **Tabela: agentes_ia**

- id: int8 (PK)
- empresa_id: int8 (FK → empresas - RLS)
- nome: String (NOT NULL)
- instrucoes: Text (System prompt)
- icone_url: String
- *Demais campos:* descricao, is_active, is_popular, cor, created_by, created_at, updated_at.

### **Tabela: conversas (Histórico de Chats)**

- id: int8 (PK)
- conversation_uuid: UUID (UNIQUE - Rastreamento)
- empresa_id: int8 (FK → empresas - RLS)
- user_id: int8 (FK → perfis)
- agente_id: int8 (FK → agentes_ia)
- mensagens: JSONB
- *Demais campos:* titulo, tokens_usados, status, contexto_atual, created_at, updated_at.

### **Tabela: uso_recursos (Controle de Limites)**

- id: int8 (PK)
- empresa_id: int8 (FK → empresas - RLS)
- mes_referencia: DATE (YYYY-MM-01)
- mensagens_enviadas: Integer DEFAULT 0
- tokens_consumidos: Integer DEFAULT 0
- *Demais campos:* agentes_ativos, usuarios_ativos, created_at, updated_at.

### **Tabela: auditoria (Logs de Ações Administrativas)**

- id: int8 (PK)
- user_id: int8 (Quem executou a ação)
- acao: String
- entidade_tipo: String
- entidade_id: int8
- *Demais campos:* empresa_id, detalhes, ip_address, user_agent, created_at.

## **6. Segurança e Compliance**

### **Requisitos de Segurança**

- **Criptografia de Dados Sensíveis:** Chaves API devem ser criptografadas (pgcrypto/Supabase Vault).
- **Row-Level Security (RLS):** Sempre habilitado em todas as tabelas com empresa_id.
- **Auditoria e Logs:** Todas as ações administrativas devem ser logadas.
- **Rate Limiting:** Implementar limitação de taxa (100 requests/minuto por empresa).
- **Validação de Entrada:** Sanitização e validação de todos os inputs.

### **Compliance**

- LGPD (Lei Geral de Proteção de Dados).
- PCI DSS (via Stripe).
- SOC 2 Type II (via Supabase e Netlify).