import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import { AGENTE_COR_OPTIONS, AGENTE_ICON_OPTIONS } from "./constants";
import type { AgenteFormMode, AgenteIA } from "./types";
import { toast } from "sonner";

interface AgenteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AgenteFormMode;
  agente?: AgenteIA | null;
}

const emptyForm = {
  nome: "",
  descricao: "",
  instrucoes: "",
  iconeId: AGENTE_ICON_OPTIONS[0].id,
  corId: AGENTE_COR_OPTIONS[0].id,
  isActive: true,
  isPopular: false,
};

export function AgenteFormDialog({
  open,
  onOpenChange,
  mode,
  agente,
}: AgenteFormDialogProps) {
  const { createAgente, updateAgente } = useAgentes();
  const [nome, setNome] = useState(emptyForm.nome);
  const [descricao, setDescricao] = useState(emptyForm.descricao);
  const [instrucoes, setInstrucoes] = useState(emptyForm.instrucoes);
  const [iconeId, setIconeId] = useState(emptyForm.iconeId);
  const [corId, setCorId] = useState(emptyForm.corId);
  const [isActive, setIsActive] = useState(emptyForm.isActive);
  const [isPopular, setIsPopular] = useState(emptyForm.isPopular);
  const [busy, setBusy] = useState(false);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && agente) {
      setNome(agente.nome);
      setDescricao(agente.descricao);
      setInstrucoes(agente.instrucoes);
      setIconeId(agente.iconeId);
      setCorId(agente.corId);
      setIsActive(agente.is_active);
      setIsPopular(agente.is_popular);
    } else {
      setNome(emptyForm.nome);
      setDescricao(emptyForm.descricao);
      setInstrucoes(emptyForm.instrucoes);
      setIconeId(emptyForm.iconeId);
      setCorId(emptyForm.corId);
      setIsActive(emptyForm.isActive);
      setIsPopular(emptyForm.isPopular);
    }
  }, [open, isEdit, agente]);

  const iconeSelecionado = AGENTE_ICON_OPTIONS.find((i) => i.id === iconeId)!;
  const corSelecionada = AGENTE_COR_OPTIONS.find((c) => c.id === corId)!;
  const PreviewIcon = iconeSelecionado.icon;

  const buildPayload = () => ({
    nome,
    descricao,
    instrucoes,
    iconeId,
    corId,
    is_active: isActive,
    is_popular: isPopular,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do agente.");
      return;
    }

    setBusy(true);
    try {
      const payload = buildPayload();
      if (isEdit && agente) {
        await updateAgente(agente.id, payload);
        toast.success("Agente atualizado com sucesso.");
      } else {
        await createAgente(payload);
        toast.success("Agente cadastrado com sucesso.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar agente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden border-border p-0 sm:max-h-[90vh]">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-12">
          <DialogTitle>{isEdit ? "Editar Agente IA" : "Novo Agente IA"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize nome, aparência, descrição e contexto do agente"
              : "Configure nome, aparência e contexto do agente para seus colaboradores"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 px-6 py-5 pb-6">
              <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                    corSelecionada.classe,
                  )}
                >
                  <PreviewIcon className="h-7 w-7 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Pré-visualização</p>
                  <p className="truncate font-semibold">{nome || "Nome do agente"}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {descricao || "Breve descrição do agente"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agente-nome">Nome</Label>
                <Input
                  id="agente-nome"
                  placeholder="Ex: Jurídico, Comercial, Suporte..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="border-border bg-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agente-descricao">Descrição breve</Label>
                <Input
                  id="agente-descricao"
                  placeholder="Ex: Compliance, Contratos e Privacidade"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="border-border bg-input"
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">
                  Resumo curto exibido no card do agente (até 120 caracteres).
                </p>
              </div>

              <div className="space-y-3">
                <Label>Ícone</Label>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
                  {AGENTE_ICON_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = iconeId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={() => setIconeId(opt.id)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {AGENTE_COR_OPTIONS.map((opt) => {
                    const selected = corId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={() => setCorId(opt.id)}
                        className={cn(
                          "h-9 w-9 rounded-full ring-offset-background transition-all",
                          opt.classe,
                          selected
                              ? "ring-2 ring-primary ring-offset-2"
                              : "opacity-80 hover:opacity-100",
                        )}
                        aria-label={opt.label}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agente-contexto">Setup de contexto</Label>
                <Textarea
                  id="agente-contexto"
                  placeholder="Descreva o papel do agente, tom de voz e regras (system prompt)..."
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  className="min-h-[140px] resize-none border-border bg-input"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto será usado como instrução base nas conversas com este agente.
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="agente-ativo">Agente ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Disponível para seleção pelos colaboradores
                    </p>
                  </div>
                  <Switch
                    id="agente-ativo"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="agente-popular">Agente popular</Label>
                    <p className="text-xs text-muted-foreground">
                      Destaque na lista de escolha do chat
                    </p>
                  </div>
                  <Switch
                    id="agente-popular"
                    checked={isPopular}
                    onCheckedChange={setIsPopular}
                    disabled={!isActive}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Salvar alterações" : "Salvar agente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
