import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import type { TenantSubscriptionInfo } from "@/features/admin/use-tenant-subscription";
import { manageByokKey, ByokKeyError } from "@/lib/api/manage-byok-key";
import { updateByokConfig } from "@/lib/api/update-byok-config";
import { getLlmProvider, LLM_PROVIDERS, type LlmProviderId } from "@/lib/byok/types";
import { toast } from "sonner";

interface AdminByokTabProps {
  info: TenantSubscriptionInfo | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

type ByokStatus = "disabled" | "pending" | "active";

function resolveByokStatus(
  enabled: boolean,
  configured: boolean,
): { status: ByokStatus; label: string; variant: "default" | "secondary" | "outline" } {
  if (!enabled) {
    return { status: "disabled", label: "BYOK desativado", variant: "outline" };
  }
  if (!configured) {
    return { status: "pending", label: "Pendente", variant: "secondary" };
  }
  return { status: "active", label: "BYOK ativo", variant: "default" };
}

export function AdminByokTab({ info, isLoading, onRefresh }: AdminByokTabProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<LlmProviderId>("openai");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState<"validate" | "save" | "rotate" | "remove" | "config" | null>(
    null,
  );
  const [removeOpen, setRemoveOpen] = useState(false);

  const configured = info?.chaveApiConfigurada ?? false;
  const providerMeta = getLlmProvider(provider);

  useEffect(() => {
    if (!info) return;
    setProvider(info.llmProvider);
    setEnabled(info.byokEnabled);
  }, [info?.llmProvider, info?.byokEnabled, info]);

  const statusMeta = resolveByokStatus(enabled, configured);

  const lastUpdateLabel = useMemo(() => {
    if (!info?.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(info.updatedAt), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return null;
    }
  }, [info?.updatedAt]);

  const persistConfig = async (patch: { enabled?: boolean; provider?: LlmProviderId }) => {
    if (!info) return;
    setBusy("config");
    try {
      await updateByokConfig({
        empresaId: info.empresaId,
        contextoIa: info.contextoIa,
        ...patch,
      });
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configuração BYOK.");
      if (patch.enabled !== undefined) setEnabled(info.byokEnabled);
      if (patch.provider !== undefined) setProvider(info.llmProvider);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleEnabled = (checked: boolean) => {
    setEnabled(checked);
    void persistConfig({ enabled: checked });
  };

  const handleProviderChange = (value: LlmProviderId) => {
    const next = getLlmProvider(value);
    if (!next.available) return;
    setProvider(value);
    void persistConfig({ provider: value });
  };

  const runKeyAction = async (
    action: "validate" | "save" | "rotate" | "remove",
    key?: string,
  ) => {
    setBusy(action);
    try {
      const result = await manageByokKey({
        action,
        api_key: key,
        provider,
      });
      toast.success(result.message ?? "Operação concluída.");
      if (action !== "validate") {
        setApiKey("");
        setShowKey(false);
        if (action !== "remove" && !enabled) {
          setEnabled(true);
          await updateByokConfig({
            empresaId: info!.empresaId,
            contextoIa: info!.contextoIa,
            enabled: true,
            provider,
          });
        }
        await onRefresh();
      }
    } catch (err) {
      const message =
        err instanceof ByokKeyError ? err.message : "Erro ao processar chave API.";
      toast.error(message);
    } finally {
      setBusy(null);
      if (action === "remove") setRemoveOpen(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }

  return (
    <>
      <Card className="border-border overflow-hidden">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">BYOK — Bring Your Own Key</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Armazene a chave da LLM com criptografia para o tenant{" "}
                <span className="font-medium text-foreground">{info?.empresaNome ?? "—"}</span>.
                Contexto, persona e guardrails ficam em{" "}
                <span className="font-medium text-foreground">Agentes IA</span>.
              </p>
              {lastUpdateLabel ? (
                <p className="text-xs text-muted-foreground">
                  Última atualização {lastUpdateLabel}
                </p>
              ) : null}
            </div>
            <Badge variant={statusMeta.variant} className="shrink-0 gap-1.5 px-3 py-1">
              {statusMeta.status === "active" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {statusMeta.label}
            </Badge>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Habilitar BYOK</p>
              <p className="text-sm text-muted-foreground">
                Use a chave da própria empresa para roteamento das requisições (Fase 4).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {enabled ? "Ativo" : "Inativo"}
              </span>
              <Switch
                checked={enabled}
                disabled={busy !== null}
                onCheckedChange={handleToggleEnabled}
                aria-label="Habilitar BYOK"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <Label htmlFor="byok-provider">Provedor LLM</Label>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as LlmProviderId)}
                disabled={busy !== null}
              >
                <SelectTrigger id="byok-provider" className="border-border bg-input">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={!item.available}>
                      {item.label}
                      {!item.available ? " (em breve)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{providerMeta.hint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="byok-api-key">Chave da API (obrigatória)</Label>
              <div className="flex gap-2">
                <Input
                  id="byok-api-key"
                  type={showKey ? "text" : "password"}
                  placeholder={providerMeta.placeholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono bg-input border-border"
                  autoComplete="off"
                  disabled={!providerMeta.available}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setShowKey((v) => !v)}
                  disabled={!apiKey.trim()}
                >
                  {showKey ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Mostrar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave é validada com o provedor antes de ser salva. Use &quot;Validar&quot; para
                testar sem persistir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!apiKey.trim() || busy !== null || !providerMeta.available}
              onClick={() => void runKeyAction("validate", apiKey)}
            >
              {busy === "validate" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Validar chave
            </Button>
            <Button
              disabled={!apiKey.trim() || busy !== null || configured || !providerMeta.available}
              onClick={() => void runKeyAction("save", apiKey)}
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar chave
            </Button>
            <Button
              variant="secondary"
              disabled={!apiKey.trim() || busy !== null || !configured || !providerMeta.available}
              onClick={() => void runKeyAction("rotate", apiKey)}
            >
              {busy === "rotate" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4 mr-2" />
              )}
              Rotacionar
            </Button>
            <Button
              variant="destructive"
              disabled={!configured || busy !== null}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover chave API?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave criptografada será apagada. O chat e agentes deixarão de funcionar até
              cadastrar uma nova chave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "remove"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy === "remove"}
              onClick={(e) => {
                e.preventDefault();
                void runKeyAction("remove");
              }}
            >
              {busy === "remove" ? "Removendo…" : "Remover chave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
