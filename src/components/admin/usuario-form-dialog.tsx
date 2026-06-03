import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ASSIGNABLE_ROLES,
  type TenantUserFormMode,
} from "@/features/auth/tenant-users-context";
import type { TenantUser } from "@/features/auth/mock-tenant-users";
import type { AppRole } from "@/features/auth/types";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TenantUserFormMode;
  usuario?: TenantUser | null;
  onSave: (data: {
    nome: string;
    email: string;
    role: AppRole;
    status: "ativo" | "inativo";
  }) => Promise<void>;
}

const emptyForm = {
  nome: "",
  email: "",
  role: "user" as AppRole,
  status: "ativo" as const,
};

function initials(nome: string) {
  return nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  mode,
  usuario,
  onSave,
}: UsuarioFormDialogProps) {
  const [nome, setNome] = useState(emptyForm.nome);
  const [email, setEmail] = useState(emptyForm.email);
  const [role, setRole] = useState<AppRole>(emptyForm.role);
  const [status, setStatus] = useState<"ativo" | "inativo">(emptyForm.status);
  const [saving, setSaving] = useState(false);

  const isEdit = mode === "edit";
  const isMasterUser = usuario?.role === "master";

  useEffect(() => {
    if (!open) return;
    if (isEdit && usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setRole(usuario.role === "master" ? "admin" : usuario.role);
      setStatus(usuario.status);
    } else {
      setNome(emptyForm.nome);
      setEmail(emptyForm.email);
      setRole(emptyForm.role);
      setStatus(emptyForm.status);
    }
  }, [open, isEdit, usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        email: email.trim(),
        role: isMasterUser ? "master" : role,
        status,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden border-border p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-12">
          <DialogTitle>
            {isEdit ? "Editar Usuário" : "Adicionar Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do colaborador da sua empresa"
              : "Um convite por e-mail será enviado para o novo usuário"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <Avatar className="h-14 w-14 border border-border">
                <AvatarFallback className="bg-muted text-lg font-medium">
                  {initials(nome || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{nome || "Nome"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {email || "email@empresa.com"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario-nome">Nome completo</Label>
              <Input
                id="usuario-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Anderson Brandão"
                className="border-border bg-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario-email">E-mail</Label>
              <Input
                id="usuario-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="border-border bg-input"
                required
                disabled={isMasterUser || (isEdit && isSupabaseConfigured())}
              />
            </div>

            <div className="space-y-2">
              <Label>Papel</Label>
              {isMasterUser ? (
                <p className="rounded-md border border-border px-3 py-2 text-sm">
                  Master (não editável)
                </p>
              ) : (
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as AppRole)}
                >
                  <SelectTrigger className="border-border bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="usuario-ativo">Usuário ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Pode acessar a plataforma quando ativo
                </p>
              </div>
              <Switch
                id="usuario-ativo"
                checked={status === "ativo"}
                disabled={isMasterUser}
                onCheckedChange={(checked) =>
                  setStatus(checked ? "ativo" : "inativo")
                }
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
