import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgenteIACard } from "@/components/agentes-ia/agente-ia-card";
import { AgentesIAStats } from "@/components/agentes-ia/agentes-ia-stats";
import { AgenteFormDialog } from "@/components/agentes-ia/agente-form-dialog";
import { mockAgentesIA } from "@/components/agentes-ia/mock-agentes";
import type { AgenteFormMode, AgenteIA } from "@/components/agentes-ia/types";

export default function AgentesIA() {
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<AgenteFormMode>("create");
  const [editingAgente, setEditingAgente] = useState<AgenteIA | null>(null);

  const openCreate = () => {
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
        </div>
        <Button
          type="button"
          className="shrink-0 bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
          onClick={openCreate}
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

      <AgentesIAStats agentes={mockAgentesIA} />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {mockAgentesIA.map((agente) => (
          <AgenteIACard key={agente.id} agente={agente} onEdit={openEdit} />
        ))}
      </div>
    </div>
  );
}
