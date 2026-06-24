import { useCallback, useEffect, useState } from "react";
import { parseMensagens } from "@/lib/api/conversas";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useSession } from "@/features/auth/session-context";
import { formatActivityLabel } from "./format";
import type { DashboardActivityItem, DashboardStats, DashboardSystemStatusItem } from "./types";

const SUCCESS_SAMPLE_LIMIT = 500;
const RECENT_ACTIVITY_LIMIT = 8;

function hasUserMessage(mensagens: unknown): boolean {
  return parseMensagens(mensagens).some((m) => m.role === "user" && m.content.trim().length > 0);
}

function hasAssistantReply(mensagens: unknown): boolean {
  return parseMensagens(mensagens).some(
    (m) => m.role === "assistant" && m.content.trim().length > 0,
  );
}

function computeSuccessRate(rows: { mensagens: unknown }[]): number {
  const withUser = rows.filter((row) => hasUserMessage(row.mensagens));
  if (withUser.length === 0) return 100;
  const successful = withUser.filter((row) => hasAssistantReply(row.mensagens)).length;
  return Math.round((successful / withUser.length) * 100);
}

function mapActivityRows(
  rows: Record<string, unknown>[],
): DashboardActivityItem[] {
  return rows.map((row) => {
    const perfil = row.perfis as Record<string, unknown> | null;
    const empresa = row.empresas as Record<string, unknown> | null;
    const acao = row.acao as string;
    const entidadeTipo = (row.entidade_tipo as string) ?? null;
    return {
      id: row.id as number,
      acao,
      label: formatActivityLabel(acao, entidadeTipo),
      empresaNome: (empresa?.nome as string) ?? null,
      userNome: (perfil?.nome_completo as string) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

function buildTenantSystemStatus(input: {
  empresaNome: string;
  isActive: boolean;
  status: string;
  byokConfigured: boolean;
  stripeStatus: string | null;
  agentesAtivos: number;
}): DashboardSystemStatusItem[] {
  const tenantOperational = input.isActive && input.status === "ativa";

  return [
    {
      id: "tenant",
      label: "Empresa",
      status: tenantOperational ? "ok" : "error",
      detail: tenantOperational
        ? `${input.empresaNome} operacional`
        : `Conta ${input.status === "suspensa" ? "suspensa" : "inativa"}`,
    },
    {
      id: "byok",
      label: "API de IA (BYOK)",
      status: input.byokConfigured ? "ok" : "warning",
      detail: input.byokConfigured ? "Chave configurada" : "Configure na aba API & BYOK",
    },
    {
      id: "agentes",
      label: "Agentes IA",
      status: input.agentesAtivos > 0 ? "ok" : "warning",
      detail:
        input.agentesAtivos > 0
          ? `${input.agentesAtivos} agente(s) ativo(s)`
          : "Nenhum agente ativo",
    },
    {
      id: "billing",
      label: "Cobrança",
      status:
        !input.stripeStatus || input.stripeStatus === "active" || input.stripeStatus === "trialing"
          ? "ok"
          : "warning",
      detail: input.stripeStatus
        ? `Stripe: ${input.stripeStatus}`
        : "Plano Free ou sem assinatura Stripe",
    },
  ];
}

function buildPlatformSystemStatus(input: {
  empresasAtivas: number;
  empresasTotal: number;
  empresasSuspensas: number;
  byokConfigured: number;
  conversasRecentes: number;
}): DashboardSystemStatusItem[] {
  const availability =
    input.empresasTotal > 0
      ? Math.round((input.empresasAtivas / input.empresasTotal) * 100)
      : 100;

  return [
    {
      id: "platform",
      label: "Plataforma",
      status: availability >= 95 ? "ok" : availability >= 80 ? "warning" : "error",
      detail: `${input.empresasAtivas}/${input.empresasTotal} empresas ativas`,
    },
    {
      id: "suspended",
      label: "Contas suspensas",
      status: input.empresasSuspensas === 0 ? "ok" : "warning",
      detail:
        input.empresasSuspensas === 0
          ? "Nenhuma suspensão"
          : `${input.empresasSuspensas} empresa(s) suspensa(s)`,
    },
    {
      id: "byok",
      label: "BYOK na base",
      status: input.byokConfigured > 0 ? "ok" : "warning",
      detail: `${input.byokConfigured} empresa(s) com chave de IA`,
    },
    {
      id: "chat",
      label: "Chat IA",
      status: input.conversasRecentes > 0 ? "ok" : "warning",
      detail:
        input.conversasRecentes > 0
          ? `${input.conversasRecentes} conversa(s) nos últimos 30 dias`
          : "Sem conversas recentes na plataforma",
    },
  ];
}

export function useDashboardStats() {
  const { user, isMaster } = useSession();
  const useSupabase = isSupabaseConfigured();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(useSupabase);

  const fetchStats = useCallback(async () => {
    if (!useSupabase || !user.empresaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const empresaId = Number(user.empresaId);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sinceIso = thirtyDaysAgo.toISOString();

      if (isMaster) {
        const [
          perfisRes,
          perfisAtivosRes,
          conversasRes,
          conversasSampleRes,
          conversasRecentRes,
          empresasRes,
          byokRes,
          auditRes,
        ] = await Promise.all([
          supabase.from("perfis").select("id", { count: "exact", head: true }),
          supabase
            .from("perfis")
            .select("id", { count: "exact", head: true })
            .eq("status", "ativo"),
          supabase.from("conversas").select("id", { count: "exact", head: true }),
          supabase
            .from("conversas")
            .select("mensagens")
            .order("updated_at", { ascending: false })
            .limit(SUCCESS_SAMPLE_LIMIT),
          supabase
            .from("conversas")
            .select("id", { count: "exact", head: true })
            .gte("updated_at", sinceIso),
          supabase.from("empresas").select("id, status, is_active, chave_api_llm"),
          supabase
            .from("empresas")
            .select("id", { count: "exact", head: true })
            .not("chave_api_llm", "is", null),
          supabase
            .from("auditoria")
            .select(
              "id, acao, entidade_tipo, created_at, perfis(nome_completo), empresas(nome)",
            )
            .order("created_at", { ascending: false })
            .limit(RECENT_ACTIVITY_LIMIT),
        ]);

        const empresas = empresasRes.data ?? [];
        const empresasTotal = empresas.length;
        const empresasAtivas = empresas.filter(
          (e) => e.is_active && e.status === "ativa",
        ).length;
        const empresasSuspensas = empresas.filter((e) => e.status === "suspensa").length;
        const uptimePercent =
          empresasTotal > 0 ? Math.round((empresasAtivas / empresasTotal) * 100) : 100;

        setStats({
          scope: "platform",
          scopeLabel: "Toda a plataforma",
          totalUsuarios: perfisRes.count ?? 0,
          usuariosAtivos: perfisAtivosRes.count ?? 0,
          conversasIa: conversasRes.count ?? 0,
          taxaSucesso: computeSuccessRate(conversasSampleRes.data ?? []),
          uptimePercent,
          uptimeLabel: `${empresasAtivas} de ${empresasTotal} empresas ativas`,
          recentActivity: mapActivityRows((auditRes.data ?? []) as Record<string, unknown>[]),
          systemStatus: buildPlatformSystemStatus({
            empresasAtivas,
            empresasTotal,
            empresasSuspensas,
            byokConfigured: byokRes.count ?? 0,
            conversasRecentes: conversasRecentRes.count ?? 0,
          }),
        });
        return;
      }

      const [
        perfisRes,
        perfisAtivosRes,
        conversasRes,
        conversasSampleRes,
        empresaRes,
        agentesRes,
        auditRes,
      ] = await Promise.all([
        supabase
          .from("perfis")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId),
        supabase
          .from("perfis")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "ativo"),
        supabase
          .from("conversas")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId),
        supabase
          .from("conversas")
          .select("mensagens")
          .eq("empresa_id", empresaId)
          .order("updated_at", { ascending: false })
          .limit(SUCCESS_SAMPLE_LIMIT),
        supabase
          .from("empresas_public")
          .select(
            "nome, status, is_active, chave_api_configurada, stripe_subscription_status",
          )
          .eq("id", empresaId)
          .single(),
        supabase
          .from("agentes_ia")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("is_active", true),
        supabase
          .from("auditoria")
          .select(
            "id, acao, entidade_tipo, created_at, perfis(nome_completo), empresas(nome)",
          )
          .eq("empresa_id", empresaId)
          .order("created_at", { ascending: false })
          .limit(RECENT_ACTIVITY_LIMIT),
      ]);

      const empresa = empresaRes.data;
      const tenantOperational = Boolean(empresa?.is_active && empresa?.status === "ativa");

      setStats({
        scope: "tenant",
        scopeLabel: user.empresaNome,
        totalUsuarios: perfisRes.count ?? 0,
        usuariosAtivos: perfisAtivosRes.count ?? 0,
        conversasIa: conversasRes.count ?? 0,
        taxaSucesso: computeSuccessRate(conversasSampleRes.data ?? []),
        uptimePercent: tenantOperational ? 100 : 0,
        uptimeLabel: tenantOperational ? "Serviço operacional" : "Conta com restrições",
        recentActivity: mapActivityRows((auditRes.data ?? []) as Record<string, unknown>[]),
        systemStatus: buildTenantSystemStatus({
          empresaNome: (empresa?.nome as string) ?? user.empresaNome,
          isActive: Boolean(empresa?.is_active),
          status: (empresa?.status as string) ?? "ativa",
          byokConfigured: Boolean(empresa?.chave_api_configurada),
          stripeStatus: (empresa?.stripe_subscription_status as string) ?? null,
          agentesAtivos: agentesRes.count ?? 0,
        }),
      });
    } catch (err) {
      console.error("[dashboard-stats]", err);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase, user.empresaId, user.empresaNome, isMaster]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats, useSupabase };
}
