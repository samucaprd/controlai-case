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
import type { MasterPlatformUser } from "@/features/master/use-master-users";
import { MASTER_ASSIGNABLE_ROLES } from "@/features/master/use-master-users";
import type { AppRole } from "@/features/auth/types";

interface MasterPlatformUsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: MasterPlatformUser | null;
  isSelf: boolean;
  onSave: (data: {
    nome: string;
    role: AppRole;
    status: "ativo" | "inativo";
  }) => Promise<void>;
}

export function MasterPlatformUsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
  isSelf,
  onSave,
}: MasterPlatformUsuarioFormDialogProps) {
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;
    setNome(usuario.nome);
    setRole(usuario.role);
    setStatus(usuario.status);
  }, [open, usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !nome.trim()) return;

    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        role: isSelf ? usuario.role : role,
        status: isSelf ? usuario.status : status,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            {usuario?.empresaNome} — alterações registradas na auditoria da plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-usuario-nome">Nome completo</Label>
            <Input
              id="master-usuario-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border-border bg-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="master-usuario-email">E-mail</Label>
            <Input
              id="master-usuario-email"
              value={usuario?.email ?? ""}
              disabled
              className="border-border bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Papel</Label>
            {isSelf ? (
              <p className="rounded-md border border-border px-3 py-2 text-sm">
                Master (não é possível alterar o próprio papel)
              </p>
            ) : (
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger className="border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MASTER_ASSIGNABLE_ROLES.map((r) => (
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
              <Label htmlFor="master-usuario-ativo">Usuário ativo</Label>
              <p className="text-xs text-muted-foreground">
                Pode acessar a plataforma quando ativo
              </p>
            </div>
            <Switch
              id="master-usuario-ativo"
              checked={status === "ativo"}
              disabled={isSelf}
              onCheckedChange={(checked) => setStatus(checked ? "ativo" : "inativo")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
