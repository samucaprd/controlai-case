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
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          nome_completo: parsed.data.name,
          empresa_nome: parsed.data.company,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    toast.success(
      "Conta criada! Verifique seu email se a confirmação estiver habilitada, ou faça login.",
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
              Preencha os dados para começar gratuitamente
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
                <Input
                  id="company"
                  type="text"
                  placeholder="Minha Empresa Ltda"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  required
                  className="bg-input border-border"
                />
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
                disabled={isSubmitting}
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
