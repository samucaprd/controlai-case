import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { fetchProfileForUser } from "@/lib/supabase/fetch-profile";
import { mapPerfilToSessionUser } from "@/lib/supabase/map-session";
import { getDefaultRouteForRole } from "@/features/auth/resolve-session";
import { useSession } from "@/features/auth/session-context";
import { mapAuthErrorMessage } from "@/features/auth/auth-errors";
import { toast } from "sonner";

function readSuggestedName(
  metadata: Record<string, unknown> | undefined,
): string {
  const fromMeta = metadata?.nome_completo;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  return "";
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { setSession, isSupabaseMode } = useSession();
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isInviteFlow, setIsInviteFlow] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured() && !isSupabaseMode) {
      navigate("/auth/login", { replace: true });
      return;
    }

    let mounted = true;
    const supabase = getSupabase();

    const init = async () => {
      const query = new URLSearchParams(window.location.search);
      const tokenHash = query.get("token_hash");
      const type = query.get("type");
      const isRecovery = type === "recovery";

      if (
        tokenHash &&
        (type === "invite" || type === "recovery" || type === "signup")
      ) {
        const otpType =
          type === "recovery"
            ? "recovery"
            : type === "signup"
              ? "signup"
              : "invite";

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (error) {
          toast.error(mapAuthErrorMessage(error.message));
          navigate("/auth/login", { replace: true });
          return;
        }
        window.history.replaceState({}, "", "/auth/accept-invite");
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        const user = data.session.user;
        setUserEmail(user.email ?? null);

        const invited =
          user.user_metadata?.invited === true ||
          user.user_metadata?.invited === "true";
        setIsInviteFlow(!isRecovery && (invited || type === "invite" || type === "signup"));

        let suggested = readSuggestedName(
          user.user_metadata as Record<string, unknown>,
        );

        if (!suggested) {
          try {
            const { perfil } = await fetchProfileForUser(user.id);
            suggested = perfil.nome_completo?.trim() ?? "";
          } catch {
            // perfil pode ainda estar provisionando
          }
        }

        setNome(suggested);
        setReady(true);
        return;
      }

      toast.error(
        "Link de convite inválido ou expirado. Peça um novo convite ao administrador.",
      );
      navigate("/auth/login", { replace: true });
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
        const suggested = readSuggestedName(
          session.user.user_metadata as Record<string, unknown>,
        );
        if (suggested) setNome(suggested);
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseMode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeTrimmed = nome.trim();

    if (isInviteFlow && !nomeTrimmed) {
      toast.error("Informe como deseja ser chamado na plataforma.");
      return;
    }

    if (isInviteFlow && nomeTrimmed.length < 2) {
      toast.error("O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabase();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        ...(isInviteFlow && nomeTrimmed
          ? { data: { nome_completo: nomeTrimmed } }
          : {}),
      });

      if (updateError) {
        toast.error(mapAuthErrorMessage(updateError.message));
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast.error("Sessão não encontrada. Abra o link do convite novamente.");
        return;
      }

      if (isInviteFlow && nomeTrimmed) {
        const { error: perfilError } = await supabase
          .from("perfis")
          .update({ nome_completo: nomeTrimmed })
          .eq("id", data.user.id);

        if (perfilError) {
          toast.error("Não foi possível salvar seu nome. Tente novamente.");
          return;
        }
      }

      const { perfil, empresa } = await fetchProfileForUser(data.user.id);
      const session = mapPerfilToSessionUser(perfil, empresa);
      setSession(session);
      toast.success(
        isInviteFlow
          ? `Bem-vindo, ${perfil.nome_completo?.split(" ")[0] ?? "ao ControlIA"}!`
          : "Senha atualizada com sucesso.",
      );
      navigate(getDefaultRouteForRole(session.role), { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível concluir o cadastro.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Validando convite…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {isInviteFlow ? "Complete seu cadastro" : "Definir senha"}
            </CardTitle>
            <CardDescription>
              {isInviteFlow ? (
                <>
                  Você foi convidado para o ControlIA
                  {userEmail ? ` (${userEmail})` : ""}. Informe seu nome e crie
                  uma senha para acessar a plataforma.
                </>
              ) : (
                <>
                  {userEmail
                    ? `Crie ou atualize a senha da conta ${userEmail}.`
                    : "Defina sua senha para continuar."}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isInviteFlow && (
                <div className="space-y-2">
                  <Label htmlFor="invite-nome">Seu nome completo</Label>
                  <Input
                    id="invite-nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Samuel Moreira"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Esse nome aparecerá no dashboard e nos chats da sua empresa.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="invite-password">
                  {isInviteFlow ? "Criar senha" : "Nova senha"}
                </Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm">Confirmar senha</Label>
                <Input
                  id="invite-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="bg-input border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting
                  ? "Salvando…"
                  : isInviteFlow
                    ? "Concluir cadastro e entrar"
                    : "Definir senha e entrar"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já concluiu o cadastro?{" "}
              <Link to="/auth/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
