import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppRole } from "@/features/auth/types";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export interface MasterPlatformUser {
  id: string;
  empresaId: number;
  empresaNome: string;
  nome: string;
  email: string;
  role: AppRole;
  status: "ativo" | "inativo";
  ultimoAcesso: string | null;
}

export interface MasterUsersStats {
  total: number;
  ativos: number;
  admins: number;
  colaboradores: number;
  masters: number;
  empresasComUsuarios: number;
}

interface PerfilWithEmpresa {
  id: string;
  empresa_id: number;
  role: AppRole;
  email: string;
  nome_completo: string | null;
  status: string;
  ultimo_acesso: string | null;
  empresas: { nome: string } | null;
}

function mapRow(row: PerfilWithEmpresa): MasterPlatformUser {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    empresaNome: row.empresas?.nome?.trim() || `Empresa #${row.empresa_id}`,
    nome: row.nome_completo?.trim() || row.email,
    email: row.email,
    role: row.role,
    status: row.status === "ativo" ? "ativo" : "inativo",
    ultimoAcesso: row.ultimo_acesso
      ? format(new Date(row.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })
      : null,
  };
}

export function useMasterUsers() {
  const useSupabase = isSupabaseConfigured();
  const [users, setUsers] = useState<MasterPlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(useSupabase);
  const [search, setSearch] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchUsers = useCallback(async () => {
    if (!useSupabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("perfis")
        .select(
          "id, empresa_id, role, email, nome_completo, status, ultimo_acesso, empresas(nome)",
        )
        .order("empresa_id", { ascending: true })
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      setUsers((data ?? []).map((row) => mapRow(row as PerfilWithEmpresa)));
    } catch (err) {
      console.error("[master-users]", err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const empresasOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of users) {
      map.set(u.empresaId, u.empresaNome);
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (empresaFilter !== "all" && String(u.empresaId) !== empresaFilter) {
        return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.empresaNome.toLowerCase().includes(q)
      );
    });
  }, [users, search, empresaFilter, roleFilter, statusFilter]);

  const stats = useMemo<MasterUsersStats>(() => {
    const empresaIds = new Set(users.map((u) => u.empresaId));
    return {
      total: users.length,
      ativos: users.filter((u) => u.status === "ativo").length,
      admins: users.filter((u) => u.role === "admin").length,
      colaboradores: users.filter((u) => u.role === "user").length,
      masters: users.filter((u) => u.role === "master").length,
      empresasComUsuarios: empresaIds.size,
    };
  }, [users]);

  return {
    users: filteredUsers,
    stats,
    empresasOptions,
    isLoading,
    search,
    setSearch,
    empresaFilter,
    setEmpresaFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    refresh: fetchUsers,
    useSupabase,
  };
}
