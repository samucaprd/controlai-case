import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgenteIACard } from "@/components/agentes-ia/agente-ia-card";
import { AgentesIAStats } from "@/components/agentes-ia/agentes-ia-stats";
import { AgenteFormDialog } from "@/components/agentes-ia/agente-form-dialog";
import { useAgentes } from "@/features/agentes-ia/agentes-context";
import { useTenantSubscription } from "@/features/admin/use-tenant-subscription";
import { RoleGate } from "@/features/auth/role-gate";
import type { AgenteFormMode, AgenteIA } from "@/components/agentes-ia/types";
import { toast } from "sonner";

function AgentesIAContent() {
  const { agentes, isLoading, canCreateMore, maxAgentes } = useAgentes();
  const { info } = useTenantSubscription();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<AgenteFormMode>("create");
  const [editingAgente, setEditingAgente] = useState<AgenteIA | null>(null);

  const openCreate = () => {
    if (!canCreateMore) {
      toast.error(
        `Limite do plano ${info?.planoNome ?? ""}: máximo ${maxAgentes} agente(s).`,
      );
      return;
    }
    setFormMode("create");
    setEditingAgente(null);
    setFormOpen(true);
  };

  const openEdit = (agente: AgenteIA) => {
    setFormMode("edit");
    setEditingAgente(agente);
    setFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes IA</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie os agentes de inteligência artificial da sua empresa
          </p>
          {info ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Plano {info.planoNome}: {agentes.length}/{maxAgentes} agentes utilizados
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          className="shrink-0 bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
          onClick={openCreate}
          disabled={!canCreateMore && !isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      <AgenteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        agente={editingAgente}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <AgentesIAStats agentes={agentes} />
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : agentes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum agente cadastrado. Clique em &quot;Novo Agente&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {agentes.map((agente) => (
            <AgenteIACard key={agente.id} agente={agente} onEdit={openEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentesIA() {
  return (
    <RoleGate allowed={["admin", "master"]} redirectTo="/dashboard/colaborador">
      <AgentesIAContent />
    </RoleGate>
  );
}
