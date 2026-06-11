import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Link, useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import { useSession } from "@/features/auth/session-context";

import {

  getDefaultRouteForRole,

  resolveSessionFromEmail,

} from "@/features/auth/resolve-session";

import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

import { getSupabase } from "@/lib/supabase/client";

import { fetchProfileForUser } from "@/lib/supabase/fetch-profile";

import { mapPerfilToSessionUser } from "@/lib/supabase/map-session";

import { mapAuthErrorMessage } from "@/features/auth/auth-errors";

import { requestPasswordReset } from "@/lib/api/auth-email";

import { toast } from "sonner";



export default function Login() {

  const navigate = useNavigate();

  const { user, setSession, isSupabaseMode, isAuthenticated, isLoading } =
    useSession();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [resetting, setResetting] = useState(false);



  const useSupabase = isSupabaseConfigured() || isSupabaseMode;



  useEffect(() => {
    if (!useSupabase || isLoading) return;
    if (!isAuthenticated) return;

    navigate(getDefaultRouteForRole(user.role), { replace: true });
  }, [useSupabase, isAuthenticated, isLoading, user.role, navigate]);



  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    setSubmitting(true);



    const normalizedEmail = email.trim().toLowerCase();



    try {

      if (useSupabase) {

        const supabase = getSupabase();

        const { data, error } = await supabase.auth.signInWithPassword({

          email: normalizedEmail,

          password,

        });



        if (error) {

          toast.error(mapAuthErrorMessage(error.message));

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



      const session = resolveSessionFromEmail(normalizedEmail);

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



  const handleForgotPassword = async () => {

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {

      toast.error("Informe seu e-mail para recuperar a senha.");

      return;

    }



    setResetting(true);

    try {

      const result = await requestPasswordReset(normalizedEmail);

      toast.success(result.message);

      if (result.email_warning) {

        toast.warning(result.email_warning);

      }

    } catch (err) {

      toast.error(

        err instanceof Error

          ? err.message

          : "Não foi possível solicitar a recuperação de senha.",

      );

    } finally {

      setResetting(false);

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

                <div className="flex items-center justify-between">

                  <Label htmlFor="password">Senha</Label>

                  {useSupabase && (

                    <button

                      type="button"

                      className="text-xs text-primary hover:underline disabled:opacity-50"

                      disabled={resetting}

                      onClick={() => void handleForgotPassword()}

                    >

                      {resetting ? "Enviando…" : "Esqueci minha senha"}

                    </button>

                  )}

                </div>

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


