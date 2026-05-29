import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { AppRole, EmpresaPublic, Perfil } from "@/lib/supabase/database.types";

interface AuthState {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  empresa: EmpresaPublic | null;
  role: AppRole | null;
  isLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string) {
  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select("id, empresa_id, role, email, nome_completo, status, avatar_url")
    .eq("id", userId)
    .single();

  if (perfilError || !perfil) {
    throw new Error("Perfil não encontrado. Aguarde o provisionamento da conta.");
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas_public")
    .select("*")
    .eq("id", perfil.empresa_id)
    .single();

  if (empresaError || !empresa) {
    throw new Error("Empresa não encontrada.");
  }

  return { perfil, empresa };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { perfil: p, empresa: e } = await fetchProfile(userId);
      setPerfil(p);
      setEmpresa(e);
      setProfileError(null);
    } catch (err) {
      setPerfil(null);
      setEmpresa(null);
      setProfileError(
        err instanceof Error ? err.message : "Erro ao carregar perfil.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      setPerfil(null);
      setEmpresa(null);
      setProfileError(null);
      setIsLoading(false);
      return;
    }

    await loadProfile(currentUser.id);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPerfil(null);
    setEmpresa(null);
    setProfileError(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      } else {
        setIsLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setPerfil(null);
        setEmpresa(null);
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setProfileError(null);

      // Defer evita deadlock com signInWithPassword (Supabase Auth lock)
      setTimeout(() => {
        if (!mounted) return;
        void loadProfile(nextSession.user.id);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      perfil,
      empresa,
      role: perfil?.role ?? null,
      isLoading,
      profileError,
      refreshProfile,
      signOut,
    }),
    [
      session,
      user,
      perfil,
      empresa,
      isLoading,
      profileError,
      refreshProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}

export function getDashboardPathForRole(role: AppRole): string {
  switch (role) {
    case "master":
      return "/dashboard/master";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/dashboard/colaborador";
  }
}
