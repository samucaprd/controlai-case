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
import type { EmpresaFormInput, MasterEmpresa, MasterPlano } from "@/features/master/types";
import { toast } from "sonner";

export type EmpresaFormMode = "create" | "edit";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: EmpresaFormMode;
  empresa?: MasterEmpresa | null;
  planos: MasterPlano[];
  onSave: (input: EmpresaFormInput) => Promise<void>;
}

const emptyForm: EmpresaFormInput = {
  nome: "",
  email: "",
  telefone: "",
  plano_id: 0,
  status: "ativa",
  is_active: true,
};

export function EmpresaFormDialog({
  open,
  onOpenChange,
  mode,
  empresa,
  planos,
  onSave,
}: EmpresaFormDialogProps) {
  const [form, setForm] = useState<EmpresaFormInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && empresa) {
      setForm({
        nome: empresa.nome,
        email: empresa.email ?? "",
        telefone: empresa.telefone ?? "",
        plano_id: empresa.plano_id,
        status: empresa.status,
        is_active: empresa.is_active,
      });
    } else {
      const defaultPlano = planos[0]?.id ?? 0;
      setForm({ ...emptyForm, plano_id: defaultPlano });
    }
  }, [open, isEdit, empresa, planos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    if (!form.plano_id) {
      toast.error("Selecione um plano.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success(isEdit ? "Empresa atualizada." : "Empresa criada.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar empresa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da empresa e o plano de assinatura."
              : "Cadastre uma nova empresa na plataforma."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa-nome">Nome</Label>
            <Input
              id="empresa-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Nome da empresa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa-email">E-mail</Label>
            <Input
              id="empresa-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contato@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa-telefone">Telefone</Label>
            <Input
              id="empresa-telefone"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select
              value={String(form.plano_id)}
              onValueChange={(v) => setForm((f) => ({ ...f, plano_id: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="empresa-ativa" className="cursor-pointer">
              Empresa ativa
            </Label>
            <Switch
              id="empresa-ativa"
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, is_active: checked }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : isEdit ? "Salvar" : "Criar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
