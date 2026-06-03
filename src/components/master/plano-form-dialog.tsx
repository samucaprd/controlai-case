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
import { Textarea } from "@/components/ui/textarea";
import type { MasterPlano, PlanoFormInput } from "@/features/master/types";
import { toast } from "sonner";

export type PlanoFormMode = "create" | "edit";

interface PlanoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PlanoFormMode;
  plano?: MasterPlano | null;
  onSave: (input: PlanoFormInput) => Promise<void>;
}

const emptyForm: PlanoFormInput = {
  nome: "",
  preco_mensal: 0,
  max_usuarios: 5,
  max_agentes: 2,
  limite_mensagens_mes: 1000,
  stripe_price_id: "",
  features: [],
  is_active: true,
  cor: "#10B981",
  usuarios_ilimitados: true,
};

function planoToForm(plano: MasterPlano): PlanoFormInput {
  return {
    nome: plano.nome,
    preco_mensal: plano.preco_mensal,
    max_usuarios: plano.max_usuarios,
    max_agentes: plano.max_agentes,
    limite_mensagens_mes: plano.limite_mensagens_mes,
    stripe_price_id: plano.stripe_price_id ?? "",
    features: plano.features,
    is_active: plano.is_active,
    cor: plano.cor ?? "#10B981",
    usuarios_ilimitados: plano.max_usuarios >= 9999,
  };
}

export function PlanoFormDialog({
  open,
  onOpenChange,
  mode,
  plano,
  onSave,
}: PlanoFormDialogProps) {
  const [form, setForm] = useState<PlanoFormInput>(emptyForm);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && plano) {
      const f = planoToForm(plano);
      setForm(f);
      setFeaturesText(f.features.join("\n"));
    } else {
      setForm(emptyForm);
      setFeaturesText("");
    }
  }, [open, isEdit, plano]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }
    const features = featuresText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await onSave({ ...form, features });
      toast.success(isEdit ? "Plano atualizado." : "Plano criado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          <DialogDescription>
            Configure preço, limites e recursos do plano de assinatura.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plano-nome">Nome</Label>
              <Input
                id="plano-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-preco">Preço mensal (R$)</Label>
              <Input
                id="plano-preco"
                type="number"
                min={0}
                step={0.01}
                value={form.preco_mensal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preco_mensal: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-cor">Cor (hex)</Label>
              <Input
                id="plano-cor"
                value={form.cor}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                placeholder="#10B981"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plano-stripe">Stripe Price ID</Label>
              <Input
                id="plano-stripe"
                value={form.stripe_price_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stripe_price_id: e.target.value }))
                }
                placeholder="price_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-agentes">Máx. agentes IA</Label>
              <Input
                id="plano-agentes"
                type="number"
                min={0}
                value={form.max_agentes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_agentes: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-mensagens">Limite mensagens/mês</Label>
              <Input
                id="plano-mensagens"
                type="number"
                min={0}
                value={form.limite_mensagens_mes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    limite_mensagens_mes: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="plano-ilimitado" className="cursor-pointer">
              Usuários ilimitados
            </Label>
            <Switch
              id="plano-ilimitado"
              checked={form.usuarios_ilimitados}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, usuarios_ilimitados: checked }))
              }
            />
          </div>

          {!form.usuarios_ilimitados && (
            <div className="space-y-2">
              <Label htmlFor="plano-usuarios">Máx. usuários</Label>
              <Input
                id="plano-usuarios"
                type="number"
                min={1}
                value={form.max_usuarios}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_usuarios: Number(e.target.value) }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plano-features">Recursos (um por linha)</Label>
            <Textarea
              id="plano-features"
              rows={5}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Chat ilimitado&#10;5 agentes IA"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="plano-ativo" className="cursor-pointer">
              Plano ativo
            </Label>
            <Switch
              id="plano-ativo"
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
              {saving ? "Salvando…" : isEdit ? "Salvar" : "Criar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
