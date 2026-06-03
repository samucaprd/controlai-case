import { cn } from "@/lib/utils";
import type { AgenteIA } from "@/components/agentes-ia/types";

interface AgenteQuickCardProps {
  agente: AgenteIA;
  selected?: boolean;
  onSelect: () => void;
  compact?: boolean;
}

export function AgenteQuickCard({
  agente,
  selected,
  onSelect,
  compact,
}: AgenteQuickCardProps) {
  const Icon = agente.icone;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/50",
          selected && "border-primary ring-1 ring-primary",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            agente.corClasse,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-medium">{agente.nome}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          agente.corClasse,
        )}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span className="font-medium">{agente.nome}</span>
    </button>
  );
}
