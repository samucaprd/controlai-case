import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AgenteIA } from "./types";

interface AgenteIACardProps {
  agente: AgenteIA;
  onEdit?: (agente: AgenteIA) => void;
}

export function AgenteIACard({ agente, onEdit }: AgenteIACardProps) {
  const [isActive, setIsActive] = useState(agente.is_active);
  const [isPopular, setIsPopular] = useState(agente.is_popular);
  const Icon = agente.icone;

  return (
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
            checked={isActive}
            onCheckedChange={setIsActive}
            aria-label={`Agente ${agente.nome} ativo`}
          />
        </div>

        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span
              className={cn(
                "font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive ? "Ativo" : "Inativo"}
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
              checked={isPopular}
              onCheckedChange={setIsPopular}
              disabled={!isActive}
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
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
