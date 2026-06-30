import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildAuditDiffRows,
  formatAuditDiffCell,
  getAuditDiffDisplayMode,
  isAuditSnapshotOnly,
} from "@/features/audit/audit-field-labels";
import { cn } from "@/lib/utils";

interface AuditLogDiffTableProps {
  acao: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}

export function AuditLogDiffTable({ acao, antes, depois }: AuditLogDiffTableProps) {
  const rows = buildAuditDiffRows(acao, antes, depois);
  const mode = getAuditDiffDisplayMode(acao, antes, depois);
  const isLegacy = isAuditSnapshotOnly(acao, antes, depois) && depois?.detalhes != null;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum detalhe disponível.</p>
    );
  }

  const valueColumnLabel =
    mode === "compare" ? null : mode === "delete" ? "Valor removido" : "Valor";

  return (
    <div className="space-y-2">
      {isLegacy && (
        <p className="text-xs text-muted-foreground">
          Resumo da ação (registro legado, sem histórico completo).
        </p>
      )}

      <div className="rounded-md border border-border overflow-x-auto bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[160px]">Campo</TableHead>
              {mode === "compare" ? (
                <>
                  <TableHead className="min-w-[140px]">Antes</TableHead>
                  <TableHead className="min-w-[140px]">Depois</TableHead>
                </>
              ) : (
                <TableHead>{valueColumnLabel}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const beforeText = formatAuditDiffCell(row.field, row.before);
              const afterText = formatAuditDiffCell(row.field, row.after);

              return (
                <TableRow key={row.field}>
                  <TableCell className="font-medium text-sm align-top">{row.label}</TableCell>

                  {mode === "compare" ? (
                    <>
                      <TableCell
                        className={cn(
                          "text-sm align-top break-words whitespace-pre-wrap",
                          beforeText &&
                            "text-destructive/90 line-through decoration-destructive/50",
                        )}
                      >
                        {beforeText || (
                          <span className="text-muted-foreground text-xs">vazio</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-sm align-top break-words whitespace-pre-wrap",
                          afterText && "font-medium text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {afterText || (
                          <span className="text-muted-foreground text-xs">vazio</span>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell
                      className={cn(
                        "text-sm align-top break-words whitespace-pre-wrap",
                        mode === "delete" && "text-destructive",
                      )}
                    >
                      {mode === "delete" ? beforeText : afterText}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {mode === "compare" && (
        <p className="text-xs text-muted-foreground">
          {rows.length} alteração(ões) · vermelho riscado = anterior · verde = novo
        </p>
      )}
    </div>
  );
}
