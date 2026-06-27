import { useCallback, useEffect, useMemo, useState } from "react";
import { archiveStripePlan, syncStripePlan } from "@/lib/api/stripe";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type {
  EmpresaFormInput,
  MasterEmpresa,
  MasterPlano,
  MasterPlatformStats,
  PlanoFormInput,
} from "./types";

const PLAN_DISPLAY_ORDER = ["Empresa", "Master", "Free", "Básico"];

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((f): f is string => typeof f === "string");
  }
  return [];
}

function mapPlano(row: Record<string, unknown>): MasterPlano {
  return {
    id: row.id as number,
    nome: row.nome as string,
    preco_mensal: Number(row.preco_mensal ?? 0),
    max_usuarios: Number(row.max_usuarios ?? 0),
    max_agentes: Number(row.max_agentes ?? 0),
    limite_mensagens_mes: Number(row.limite_mensagens_mes ?? 0),
    stripe_price_id: (row.stripe_price_id as string) ?? null,
    stripe_product_id: (row.stripe_product_id as string) ?? null,
    features: parseFeatures(row.features),
    is_active: Boolean(row.is_active),
    cor: (row.cor as string) ?? null,
  };
}

export function useMasterPlatform() {
  const useSupabase = isSupabaseConfigured();
  const [empresas, setEmpresas] = useState<MasterEmpresa[]>([]);
  const [planos, setPlanos] = useState<MasterPlano[]>([]);
  const [isLoading, setIsLoading] = useState(useSupabase);
  const [searchEmpresa, setSearchEmpresa] = useState("");

  const fetchData = useCallback(async () => {
    if (!useSupabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();

      const [{ data: planosData, error: planosError }, { data: empresasData, error: empresasError }] =
        await Promise.all([
          supabase.from("planos").select("*").order("preco_mensal", { ascending: true }),
          supabase
            .from("empresas")
            .select("*, planos(nome, preco_mensal, cor)")
            .order("created_at", { ascending: false }),
        ]);

      if (planosError) throw planosError;
      if (empresasError) throw empresasError;

      const mappedPlanos = (planosData ?? []).map((p) =>
        mapPlano(p as Record<string, unknown>),
      );
      setPlanos(mappedPlanos);

      const { data: perfisData } = await supabase
        .from("perfis")
        .select("empresa_id, status, ultimo_acesso");

      const counts = new Map<
        number,
        { total: number; ativos: number; ultimo_acesso: string | null }
      >();
      for (const p of perfisData ?? []) {
        const eid = p.empresa_id as number;
        const cur = counts.get(eid) ?? { total: 0, ativos: 0, ultimo_acesso: null };
        cur.total += 1;
        if (p.status === "ativo") cur.ativos += 1;
        const ua = p.ultimo_acesso as string | null;
        if (ua && (!cur.ultimo_acesso || ua > cur.ultimo_acesso)) {
          cur.ultimo_acesso = ua;
        }
        counts.set(eid, cur);
      }

      const mappedEmpresas: MasterEmpresa[] = (empresasData ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const plano = r.planos as Record<string, unknown> | null;
        const eid = r.id as number;
        const c = counts.get(eid) ?? { total: 0, ativos: 0, ultimo_acesso: null };
        return {
          id: eid,
          nome: (r.nome as string) ?? "",
          email: (r.email as string) ?? null,
          telefone: (r.telefone as string) ?? null,
          status: (r.status as string) ?? "ativa",
          is_active: Boolean(r.is_active),
          plano_id: r.plano_id as number,
          plano_nome: (plano?.nome as string) ?? "—",
          plano_cor: (plano?.cor as string) ?? null,
          preco_mensal: Number(plano?.preco_mensal ?? 0),
          usuarios: c.total,
          usuarios_ativos: c.ativos,
          ultimo_acesso: c.ultimo_acesso,
        };
      });

      setEmpresas(mappedEmpresas);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const stats = useMemo<MasterPlatformStats>(() => {
    const ativas = empresas.filter((e) => e.is_active && e.status !== "suspensa");
    const suspensas = empresas.filter(
      (e) => !e.is_active || e.status === "suspensa",
    );
    const receitaMensal = ativas.reduce((sum, e) => sum + e.preco_mensal, 0);

    const countByPlano = new Map<string, { cor: string; count: number }>();
    for (const p of planos) {
      countByPlano.set(p.nome, { cor: p.cor ?? "#6B7280", count: 0 });
    }
    for (const e of empresas) {
      const cur = countByPlano.get(e.plano_nome);
      if (cur) cur.count += 1;
      else countByPlano.set(e.plano_nome, { cor: e.plano_cor ?? "#6B7280", count: 1 });
    }

    const empresasPorPlano = PLAN_DISPLAY_ORDER.filter((n) => countByPlano.has(n)).map(
      (nome) => ({
        nome,
        cor: countByPlano.get(nome)!.cor,
        count: countByPlano.get(nome)!.count,
      }),
    );

    for (const [nome, data] of countByPlano) {
      if (!PLAN_DISPLAY_ORDER.includes(nome)) {
        empresasPorPlano.push({ nome, cor: data.cor, count: data.count });
      }
    }

    const churnRate =
      empresas.length > 0
        ? Number(((suspensas.length / empresas.length) * 100).toFixed(1))
        : 0;

    return {
      totalEmpresas: empresas.length,
      empresasAtivas: ativas.length,
      receitaMensal,
      empresasSuspensas: suspensas.length,
      churnRate,
      churnDelta: 0,
      receitaDelta: 0,
      empresasPorPlano,
    };
  }, [empresas, planos]);

  const filteredEmpresas = useMemo(() => {
    const q = searchEmpresa.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        (e.email?.toLowerCase().includes(q) ?? false),
    );
  }, [empresas, searchEmpresa]);

  const sortedPlanos = useMemo(() => {
    const order = ["Free", "Básico", "Empresa", "Master"];
    return [...planos].sort(
      (a, b) => order.indexOf(a.nome) - order.indexOf(b.nome),
    );
  }, [planos]);

  const createEmpresa = useCallback(
    async (input: EmpresaFormInput) => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("empresas")
        .insert({
          nome: input.nome.trim(),
          email: input.email.trim() || null,
          telefone: input.telefone.trim() || null,
          plano_id: input.plano_id,
          status: input.status,
          is_active: input.is_active,
        })
        .select("id")
        .single();
      if (error) throw error;
      await fetchData();
    },
    [fetchData],
  );

  const updateEmpresa = useCallback(
    async (id: number, input: EmpresaFormInput) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: input.nome.trim(),
          email: input.email.trim() || null,
          telefone: input.telefone.trim() || null,
          plano_id: input.plano_id,
          status: input.status,
          is_active: input.is_active,
        })
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData],
  );

  const deleteEmpresa = useCallback(
    async (id: number) => {
      const supabase = getSupabase();
      const { error } = await supabase.from("empresas").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData],
  );

  const createPlano = useCallback(
    async (input: PlanoFormInput) => {
      const supabase = getSupabase();
      const maxUsuarios = input.usuarios_ilimitados ? 9999 : input.max_usuarios;
      const { data, error } = await supabase
        .from("planos")
        .insert({
          nome: input.nome.trim(),
          preco_mensal: input.preco_mensal,
          max_usuarios: maxUsuarios,
          max_agentes: input.max_agentes,
          limite_mensagens_mes: input.limite_mensagens_mes,
          features: input.features,
          is_active: input.is_active,
          cor: input.cor,
        })
        .select("id")
        .single();
      if (error) throw error;

      await syncStripePlan({
        plano_id: data.id as number,
        nome: input.nome.trim(),
        preco_mensal: input.preco_mensal,
        is_active: input.is_active,
      });

      await fetchData();
    },
    [fetchData],
  );

  const updatePlano = useCallback(
    async (id: number, input: PlanoFormInput) => {
      const supabase = getSupabase();
      const maxUsuarios = input.usuarios_ilimitados ? 9999 : input.max_usuarios;
      const existing = planos.find((p) => p.id === id);

      await syncStripePlan({
        plano_id: id,
        nome: input.nome.trim(),
        preco_mensal: input.preco_mensal,
        stripe_price_id: existing?.stripe_price_id,
        stripe_product_id: existing?.stripe_product_id,
        is_active: input.is_active,
      });

      const { error } = await supabase
        .from("planos")
        .update({
          nome: input.nome.trim(),
          preco_mensal: input.preco_mensal,
          max_usuarios: maxUsuarios,
          max_agentes: input.max_agentes,
          limite_mensagens_mes: input.limite_mensagens_mes,
          features: input.features,
          is_active: input.is_active,
          cor: input.cor,
        })
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData, planos],
  );

  const deletePlano = useCallback(
    async (id: number) => {
      try {
        await archiveStripePlan(id);
      } catch {
        // Plano pode não ter produto Stripe — segue exclusão
      }
      const supabase = getSupabase();
      const { error } = await supabase.from("planos").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData],
  );

  const togglePlanoActive = useCallback(
    async (id: number, isActive: boolean) => {
      const plano = planos.find((p) => p.id === id);
      if (plano) {
        await syncStripePlan({
          plano_id: id,
          nome: plano.nome,
          preco_mensal: plano.preco_mensal,
          stripe_price_id: plano.stripe_price_id,
          stripe_product_id: plano.stripe_product_id,
          is_active: isActive,
        });
      }
      const supabase = getSupabase();
      const { error } = await supabase
        .from("planos")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    },
    [fetchData, planos],
  );

  const syncAllPlanosStripe = useCallback(async () => {
    for (const plano of planos) {
      await syncStripePlan({
        plano_id: plano.id,
        nome: plano.nome,
        preco_mensal: plano.preco_mensal,
        stripe_price_id: plano.stripe_price_id,
        stripe_product_id: plano.stripe_product_id,
        is_active: plano.is_active,
      });
    }
    await fetchData();
  }, [fetchData, planos]);

  return {
    empresas: filteredEmpresas,
    planos: sortedPlanos,
    allPlanos: planos,
    stats,
    isLoading,
    searchEmpresa,
    setSearchEmpresa,
    refresh: fetchData,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
    createPlano,
    updatePlano,
    deletePlano,
    togglePlanoActive,
    syncAllPlanosStripe,
    useSupabase,
  };
}
