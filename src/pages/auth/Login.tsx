import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  getDashboardPathForRole,
  useAuth,
} from "@/features/auth/auth-context";
import { toast } from "sonner";
import type { AppRole } from "@/lib/supabase/database.types";

export default function Login() {
  const navigate = useNavigate();
  const { session, role, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session && role) {
      navigate(getDashboardPathForRole(role), { replace: true });
    }
  }, [isLoading, session, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      toast.error("Não foi possível autenticar.");
      setIsSubmitting(false);
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (perfilError || !perfil) {
      toast.error(
        "Conta criada, mas perfil ainda não disponível. Tente novamente em instantes.",
      );
      setIsSubmitting(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
    navigate(getDashboardPathForRole(perfil.role as AppRole), { replace: true });
    setIsSubmitting(false);
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
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
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
