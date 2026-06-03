import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "@/features/auth/session-context";
import {
  getDefaultRouteForRole,
  resolveSessionFromEmail,
} from "@/features/auth/resolve-session";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getSupabase } from "@/lib/supabase/client";
import { fetchProfileForUser } from "@/lib/supabase/fetch-profile";
import { mapPerfilToSessionUser } from "@/lib/supabase/map-session";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { setSession, isSupabaseMode } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSupabaseConfigured() || isSupabaseMode) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (!data.user) {
          toast.error("Não foi possível autenticar.");
          return;
        }

        const { perfil, empresa } = await fetchProfileForUser(data.user.id);
        const session = mapPerfilToSessionUser(perfil, empresa);
        setSession(session);
        navigate(getDefaultRouteForRole(session.role), { replace: true });
        return;
      }

      const session = resolveSessionFromEmail(email);
      setSession(session);
      navigate(getDefaultRouteForRole(session.role), { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao entrar. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/">
            <h1 className="text-3xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              ControlIA.io
            </h1>
          </Link>
        </div>

        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
              >
                {submitting ? "Entrando…" : "Entrar"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link to="/auth/register" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
