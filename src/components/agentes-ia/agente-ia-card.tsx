import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import type { AgenteIA } from "./types";
import { toast } from "sonner";

interface AgenteIACardProps {
  agente: AgenteIA;
  onEdit?: (agente: AgenteIA) => void;
}

export function AgenteIACard({ agente, onEdit }: AgenteIACardProps) {
  const { updateAgente, deleteAgente } = useAgentes();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const Icon = agente.icone;

  const handleToggle = async (
    field: "is_active" | "is_popular",
    checked: boolean,
  ) => {
    try {
      await updateAgente(agente.id, { [field]: checked });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar agente.");
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteAgente(agente.id);
      toast.success("Agente excluído.");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir agente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  agente.corClasse,
                )}
              >
                <Icon className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className="truncate font-semibold leading-tight">{agente.nome}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {agente.descricao}
                </p>
              </div>
            </div>
            <Switch
              checked={agente.is_active}
              onCheckedChange={(checked) => void handleToggle("is_active", checked)}
              aria-label={`Agente ${agente.nome} ativo`}
            />
          </div>

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={cn(
                  "font-medium",
                  agente.is_active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {agente.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor={`popular-${agente.id}`}
                className="text-sm text-muted-foreground"
              >
                Popular:
              </Label>
              <Switch
                id={`popular-${agente.id}`}
                checked={agente.is_popular}
                onCheckedChange={(checked) => void handleToggle("is_popular", checked)}
                disabled={!agente.is_active}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Criado em:</span>
              <span>{agente.criadoEm}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border"
              aria-label={`Editar agente ${agente.nome}`}
              onClick={() => onEdit?.(agente)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border text-destructive hover:text-destructive"
              aria-label={`Excluir agente ${agente.nome}`}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente &quot;{agente.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Conversas vinculadas a este agente
              permanecerão sem agente associado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {busy ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
