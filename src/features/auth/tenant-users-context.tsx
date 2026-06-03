import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { mockTenantUsers, type TenantUser } from "./mock-tenant-users";
import { useSession } from "./session-context";
import type { AppRole } from "./types";
import { deleteTenantUser } from "@/lib/api/delete-tenant-user";
import { logAudit } from "@/lib/audit/log-audit";
import { inviteTenantUser, InviteUserError } from "@/lib/api/invite-tenant-user";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const TENANT_USERS_STORAGE_KEY = "controlia_tenant_users_state";

type UserOverrides = Record<string, Partial<TenantUser>>;

interface TenantUsersPersistence {
  overrides: UserOverrides;
  added: TenantUser[];
}

function loadPersistence(): TenantUsersPersistence {
  try {
    const raw = localStorage.getItem(TENANT_USERS_STORAGE_KEY);
    if (!raw) return { overrides: {}, added: [] };
    const parsed = JSON.parse(raw) as TenantUsersPersistence;
    return {
      overrides: parsed.overrides ?? {},
      added: parsed.added ?? [],
    };
  } catch {
    return { overrides: {}, added: [] };
  }
}

function savePersistence(state: TenantUsersPersistence) {
  localStorage.setItem(TENANT_USERS_STORAGE_KEY, JSON.stringify(state));
}

function buildUsersForEmpresa(empresaId: string): TenantUser[] {
  const { overrides, added } = loadPersistence();
  const fromMock = mockTenantUsers
    .filter((u) => u.empresaId === empresaId)
    .map((u) => ({ ...u, ...overrides[u.id] }));
  const fromAdded = added
    .filter((u) => u.empresaId === empresaId)
    .map((u) => ({ ...u, ...overrides[u.id] }));
  return [...fromMock, ...fromAdded];
}

function persistEmpresaUsers(empresaId: string, tenantUsers: TenantUser[]) {
  const state = loadPersistence();
  const mockIds = new Set(
    mockTenantUsers.filter((m) => m.empresaId === empresaId).map((m) => m.id),
  );

  const overrides: UserOverrides = { ...state.overrides };
  const addedForEmpresa: TenantUser[] = [];

  for (const u of tenantUsers) {
    if (mockIds.has(u.id)) {
      const base = mockTenantUsers.find((m) => m.id === u.id)!;
      const diff: Partial<TenantUser> = {};
      if (u.nome !== base.nome) diff.nome = u.nome;
      if (u.email !== base.email) diff.email = u.email;
      if (u.role !== base.role) diff.role = u.role;
      if (u.status !== base.status) diff.status = u.status;
      if (Object.keys(diff).length > 0) {
        overrides[u.id] = { ...overrides[u.id], ...diff };
      } else {
        delete overrides[u.id];
      }
    } else {
      addedForEmpresa.push(u);
    }
  }

  const addedOther = state.added.filter((a) => a.empresaId !== empresaId);
  savePersistence({
    overrides,
    added: [...addedOther, ...addedForEmpresa],
  });
}

function mapPerfilRowToTenantUser(row: {
  id: string;
  empresa_id: number;
  role: AppRole;
  email: string;
  nome_completo: string | null;
  status: string;
  ultimo_acesso: string | null;
}): TenantUser {
  return {
    id: row.id,
    empresaId: String(row.empresa_id),
    nome: row.nome_completo?.trim() || row.email,
    email: row.email,
    role: row.role,
    status: row.status === "ativo" ? "ativo" : "inativo",
    ultimoAcesso: row.ultimo_acesso
      ? format(new Date(row.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })
      : null,
  };
}

export type TenantUserFormMode = "create" | "edit";

export interface TenantUserFormInput {
  nome: string;
  email: string;
  role: AppRole;
  status: "ativo" | "inativo";
}

export interface RemoveTenantUserOptions {
  motivo?: string;
  notifyByEmail?: boolean;
}

interface TenantUsersContextValue {
  users: TenantUser[];
  isLoading: boolean;
  updateUser: (id: string, patch: Partial<TenantUser>) => Promise<void>;
  addUser: (input: TenantUserFormInput) => Promise<void>;
  saveUser: (id: string, input: TenantUserFormInput) => Promise<void>;
  removeUser: (
    id: string,
    options?: RemoveTenantUserOptions,
  ) => Promise<{ email_sent: boolean; email_warning: string | null }>;
}

const TenantUsersContext = createContext<TenantUsersContextValue | undefined>(
  undefined,
);

export function TenantUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const useSupabase = isSupabaseConfigured();
  const [users, setUsers] = useState<TenantUser[]>(() =>
    useSupabase ? [] : buildUsersForEmpresa(user.empresaId),
  );
  const [isLoading, setIsLoading] = useState(useSupabase);

  const empresaIdNumeric = Number(user.empresaId);

  const fetchFromSupabase = useCallback(async () => {
    if (!useSupabase || Number.isNaN(empresaIdNumeric)) return;

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("perfis")
        .select(
          "id, empresa_id, role, email, nome_completo, status, ultimo_acesso",
        )
        .eq("empresa_id", empresaIdNumeric)
        .order("nome_completo", { ascending: true });

      if (error) throw error;
      setUsers((data ?? []).map(mapPerfilRowToTenantUser));
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase, empresaIdNumeric]);

  useEffect(() => {
    if (useSupabase) {
      void fetchFromSupabase();
      return;
    }
    setUsers(buildUsersForEmpresa(user.empresaId));
  }, [useSupabase, user.empresaId, fetchFromSupabase]);

  const applyAndPersist = useCallback(
    (updater: (prev: TenantUser[]) => TenantUser[]) => {
      setUsers((prev) => {
        const next = updater(prev);
        persistEmpresaUsers(user.empresaId, next);
        return next;
      });
    },
    [user.empresaId],
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<TenantUser>) => {
      if (useSupabase) {
        const supabase = getSupabase();
        const dbPatch: Record<string, unknown> = {};
        if (patch.nome !== undefined) dbPatch.nome_completo = patch.nome;
        if (patch.role !== undefined && patch.role !== "master") {
          dbPatch.role = patch.role;
        }
        if (patch.status !== undefined) dbPatch.status = patch.status;

        const { error } = await supabase
          .from("perfis")
          .update(dbPatch)
          .eq("id", id)
          .eq("empresa_id", empresaIdNumeric);

        if (error) throw error;
        await fetchFromSupabase();
        return;
      }

      applyAndPersist((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      );
    },
    [useSupabase, empresaIdNumeric, applyAndPersist, fetchFromSupabase],
  );

  const addUser = useCallback(
    async (input: TenantUserFormInput) => {
      if (input.role === "master") return;

      if (useSupabase) {
        if (input.role !== "user" && input.role !== "admin") {
          throw new InviteUserError("Papel inválido para convite.");
        }

        await inviteTenantUser({
          email: input.email,
          nome_completo: input.nome,
          role: input.role,
        });
        await logAudit({
          acao: "usuario_convidado",
          entidade_tipo: "perfil",
          empresa_id: empresaIdNumeric,
          detalhes: { email: input.email, role: input.role },
        });
        await fetchFromSupabase();
        return;
      }

      const novo: TenantUser = {
        id: `custom-${Date.now()}`,
        empresaId: user.empresaId,
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        status: input.status,
        ultimoAcesso: null,
      };
      applyAndPersist((prev) => [...prev, novo]);
    },
    [useSupabase, user.empresaId, empresaIdNumeric, applyAndPersist, fetchFromSupabase],
  );

  const saveUser = useCallback(
    async (id: string, input: TenantUserFormInput) => {
      const target = users.find((u) => u.id === id);
      if (!target || target.role === "master") return;

      await updateUser(id, {
        nome: input.nome.trim(),
        role: input.role === "master" ? target.role : input.role,
        status: input.status,
        ...(useSupabase ? {} : { email: input.email.trim().toLowerCase() }),
      });

      if (useSupabase) {
        await logAudit({
          acao: "usuario_atualizado",
          entidade_tipo: "perfil",
          empresa_id: empresaIdNumeric,
          detalhes: { email: target.email, role: input.role, status: input.status },
        });
      }
    },
    [users, updateUser, useSupabase, empresaIdNumeric],
  );

  const removeUser = useCallback(
    async (id: string, options?: RemoveTenantUserOptions) => {
      const target = users.find((u) => u.id === id);
      if (!target || target.role === "master") {
        throw new Error("Não é possível excluir este usuário.");
      }

      if (useSupabase) {
        const result = await deleteTenantUser({
          user_id: id,
          motivo: options?.motivo,
          notify_by_email: options?.notifyByEmail,
        });
        await logAudit({
          acao: "usuario_excluido",
          entidade_tipo: "perfil",
          empresa_id: empresaIdNumeric,
          detalhes: { email: target.email, motivo: options?.motivo },
        });
        await fetchFromSupabase();
        return result;
      }

      applyAndPersist((prev) => prev.filter((u) => u.id !== id));
      return { email_sent: false, email_warning: null };
    },
    [users, useSupabase, empresaIdNumeric, applyAndPersist, fetchFromSupabase],
  );

  const value = useMemo(
    () => ({ users, isLoading, updateUser, addUser, saveUser, removeUser }),
    [users, isLoading, updateUser, addUser, saveUser, removeUser],
  );

  return (
    <TenantUsersContext.Provider value={value}>
      {children}
    </TenantUsersContext.Provider>
  );
}

export function useTenantUsers() {
  const ctx = useContext(TenantUsersContext);
  if (!ctx) {
    throw new Error("useTenantUsers deve ser usado dentro de TenantUsersProvider");
  }
  return ctx;
}

export const ASSIGNABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "Colaborador" },
];

