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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import {
  checkEmpresaDisponivel,
  sendWelcomeEmail,
} from "@/lib/api/auth-email";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    company: z.string().min(2, "Nome da empresa é obrigatório"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyCheckLoading, setCompanyCheckLoading] = useState(false);
  const [companyDisponivel, setCompanyDisponivel] = useState<boolean | null>(
    null,
  );
  const [companyMotivo, setCompanyMotivo] = useState<string | null>(null);

  const verifyCompany = useCallback(async (company: string) => {
    const trimmed = company.trim();
    if (trimmed.length < 2) {
      setCompanyDisponivel(null);
      setCompanyMotivo(null);
      return;
    }

    setCompanyCheckLoading(true);
    try {
      const result = await checkEmpresaDisponivel(trimmed);
      setCompanyDisponivel(result.disponivel);
      setCompanyMotivo(result.motivo);
    } catch {
      setCompanyDisponivel(null);
      setCompanyMotivo(null);
    } finally {
      setCompanyCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void verifyCompany(formData.company);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.company, verifyCompany]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }

    if (companyDisponivel === false) {
      toast.error(
        companyMotivo ??
          "Esta empresa já está cadastrada. Solicite um convite ao administrador.",
      );
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          nome_completo: parsed.data.name,
          empresa_nome: parsed.data.company.trim(),
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("empresa já cadastrada") ||
        msg.includes("unique") ||
        msg.includes("duplicate")
      ) {
        toast.error(
          "Esta empresa já está cadastrada. Solicite um convite ao administrador ou faça login.",
        );
      } else {
        toast.error(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      try {
        await sendWelcomeEmail();
      } catch {
        // boas-vindas é best-effort
      }
    }

    toast.success(
      data.session
        ? "Conta criada com sucesso! Verifique seu e-mail de boas-vindas."
        : "Conta criada! Verifique seu e-mail se a confirmação estiver habilitada, ou faça login.",
    );
    navigate("/auth/login");
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
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              Cadastre sua empresa e comece gratuitamente no plano Free
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <div className="relative">
                  <Input
                    id="company"
                    type="text"
                    placeholder="Minha Empresa Ltda"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    required
                    className="bg-input border-border pr-10"
                  />
                  {companyCheckLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {companyDisponivel === false && companyMotivo && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {companyMotivo}{" "}
                      <Link to="/auth/login" className="underline font-medium">
                        Fazer login
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}
                {companyDisponivel === true && formData.company.trim().length >= 2 && (
                  <p className="text-xs text-primary">
                    Nome de empresa disponível para cadastro.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Cada empresa pode ter apenas um cadastro inicial. Colaboradores
                  entram via convite do administrador.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  className="bg-input border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  companyDisponivel === false ||
                  companyCheckLoading
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
              >
                {isSubmitting ? "Criando..." : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link to="/auth/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
