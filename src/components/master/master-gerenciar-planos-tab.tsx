import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PlanoFormDialog, type PlanoFormMode } from "@/components/master/plano-form-dialog";
import { formatPlanoPreco } from "@/features/master/format";
import { isStripeSynced } from "@/lib/api/stripe";
import type { MasterPlano, PlanoFormInput } from "@/features/master/types";
import { toast } from "sonner";

interface MasterGerenciarPlanosTabProps {
  planos: MasterPlano[];
  isLoading: boolean;
  onCreate: (input: PlanoFormInput) => Promise<void>;
  onUpdate: (id: number, input: PlanoFormInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggleActive: (id: number, isActive: boolean) => Promise<void>;
  onSyncAllStripe?: () => Promise<void>;
}

export function MasterGerenciarPlanosTab({
  planos,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
  onSyncAllStripe,
}: MasterGerenciarPlanosTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<PlanoFormMode>("create");
  const [editing, setEditing] = useState<MasterPlano | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterPlano | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (plano: MasterPlano) => {
    setDialogMode("edit");
    setEditing(plano);
    setDialogOpen(true);
  };

  const handleSave = async (input: PlanoFormInput) => {
    if (dialogMode === "edit" && editing) {
      await onUpdate(editing.id, input);
    } else {
      await onCreate(input);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      toast.success("Plano excluído.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir. O plano pode estar em uso.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (plano: MasterPlano, checked: boolean) => {
    try {
      await onToggleActive(plano.id, checked);
      toast.success(checked ? "Plano ativado." : "Plano desativado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar plano.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Planos de Assinatura</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e gerencie os planos disponíveis
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
          {onSyncAllStripe && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={syncing || isLoading}
              onClick={() => {
                setSyncing(true);
                void onSyncAllStripe()
                  .then(() => toast.success("Planos sincronizados com o Stripe."))
                  .catch((err) =>
                    toast.error(err instanceof Error ? err.message : "Erro ao sincronizar."),
                  )
                  .finally(() => setSyncing(false));
              }}
            >
              {syncing ? "Sincronizando…" : "Sincronizar Stripe"}
            </Button>
          )}
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {planos.map((plano) => (
            <Card
              key={plano.id}
              className="border-border bg-card/50 flex flex-col overflow-hidden"
            >
              <CardContent className="flex flex-col flex-1 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: plano.cor ?? "#6B7280" }}
                    />
                    <span className="font-semibold truncate">{plano.nome}</span>
                  </div>
                  <Switch
                    checked={plano.is_active}
                    onCheckedChange={(checked) => void handleToggle(plano, checked)}
                  />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant={isStripeSynced(plano.stripe_price_id) ? "default" : "secondary"}
                    className="text-xs font-normal"
                  >
                    {isStripeSynced(plano.stripe_price_id)
                      ? plano.preco_mensal <= 0
                        ? "Stripe sincronizado (R$ 0)"
                        : "Stripe sincronizado"
                      : plano.preco_mensal <= 0
                        ? "Gratuito — sync pendente"
                        : "Stripe pendente"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {plano.max_usuarios >= 9999
                    ? "Usuários ilimitados"
                    : `Até ${plano.max_usuarios} usuários`}
                </p>

                <p className="text-2xl font-bold mt-4">{formatPlanoPreco(plano.preco_mensal)}</p>

                <ul className="mt-4 space-y-2 flex-1">
                  {plano.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                  {plano.features.length === 0 && (
                    <li className="text-sm text-muted-foreground italic">
                      Sem recursos cadastrados
                    </li>
                  )}
                </ul>

                <div className="flex gap-2 mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => openEdit(plano)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setDeleteTarget(plano)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        plano={editing}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano <strong>{deleteTarget?.nome}</strong> será removido. Empresas
              vinculadas podem impedir a exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
