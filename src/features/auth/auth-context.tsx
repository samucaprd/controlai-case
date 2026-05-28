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

  const refreshProfile = useCallback(async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      setPerfil(null);
      setEmpresa(null);
      return;
    }

    const { perfil: p, empresa: e } = await fetchProfile(currentUser.id);
    setPerfil(p);
    setEmpresa(e);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPerfil(null);
    setEmpresa(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        try {
          const { perfil: p, empresa: e } = await fetchProfile(data.session.user.id);
          setPerfil(p);
          setEmpresa(e);
        } catch {
          setPerfil(null);
          setEmpresa(null);
        }
      }

      setIsLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          const { perfil: p, empresa: e } = await fetchProfile(nextSession.user.id);
          setPerfil(p);
          setEmpresa(e);
        } catch {
          setPerfil(null);
          setEmpresa(null);
        }
      } else {
        setPerfil(null);
        setEmpresa(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      perfil,
      empresa,
      role: perfil?.role ?? null,
      isLoading,
      refreshProfile,
      signOut,
    }),
    [session, user, perfil, empresa, isLoading, refreshProfile, signOut],
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
