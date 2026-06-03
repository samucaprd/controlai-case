import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SessionUser } from "./types";
import { SESSION_STORAGE_KEY } from "./types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getSupabase } from "@/lib/supabase/client";
import { fetchProfileForUser } from "@/lib/supabase/fetch-profile";
import { mapPerfilToSessionUser } from "@/lib/supabase/map-session";

const defaultSession: SessionUser = {
  id: "guest",
  nome: "Usuário",
  email: "guest@local.dev",
  empresaId: "empresa-demo",
  empresaNome: "Sua Empresa",
  role: "user",
};

function loadSession(): SessionUser {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return defaultSession;
    return { ...defaultSession, ...JSON.parse(raw) } as SessionUser;
  } catch {
    return defaultSession;
  }
}

interface SessionContextValue {
  user: SessionUser;
  setSession: (user: SessionUser) => void;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMaster: boolean;
  isColaborador: boolean;
  canManageTenant: boolean;
  isLoading: boolean;
  isSupabaseMode: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const isSupabaseMode = isSupabaseConfigured();
  const [user, setUser] = useState<SessionUser>(() =>
    isSupabaseMode ? defaultSession : loadSession(),
  );
  const [isLoading, setIsLoading] = useState(isSupabaseMode);

  const setSession = useCallback((next: SessionUser) => {
    if (!isSupabaseMode) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    }
    setUser(next);
  }, [isSupabaseMode]);

  const signOut = useCallback(async () => {
    if (isSupabaseMode) {
      await getSupabase().auth.signOut();
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setUser(defaultSession);
  }, [isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode) return;

    let mounted = true;
    const supabase = getSupabase();

    const syncFromAuthUser = async (userId: string | undefined) => {
      if (!userId) {
        if (mounted) {
          setUser(defaultSession);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { perfil, empresa } = await fetchProfileForUser(userId);
        if (mounted) {
          setUser(mapPerfilToSessionUser(perfil, empresa));
        }
      } catch {
        if (mounted) setUser(defaultSession);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await syncFromAuthUser(data.session?.user?.id);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncFromAuthUser(session?.user?.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseMode]);

  const value = useMemo<SessionContextValue>(() => {
    const isMaster = user.role === "master";
    const isAdmin = user.role === "admin";
    const isColaborador = user.role === "user";
    return {
      user,
      setSession,
      signOut,
      isMaster,
      isAdmin,
      isColaborador,
      canManageTenant: isMaster || isAdmin,
      isLoading,
      isSupabaseMode,
    };
  }, [user, setSession, signOut, isLoading, isSupabaseMode]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }
  return ctx;
}

export function persistSession(user: SessionUser) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}
