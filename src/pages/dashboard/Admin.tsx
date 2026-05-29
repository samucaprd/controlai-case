import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Key, Settings as SettingsIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { RoleGate } from "@/features/auth/role-gate";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

function parseInstrucoes(contexto: unknown): string {
  if (contexto && typeof contexto === "object" && "instrucoes" in contexto) {
    const val = (contexto as { instrucoes?: unknown }).instrucoes;
    return typeof val === "string" ? val : "";
  }
  return "";
}

function AdminContent() {
  const { empresa, refreshProfile } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [aiRules, setAiRules] = useState("");
  const [enableByok, setEnableByok] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (empresa?.contexto_ia) {
      setAiRules(parseInstrucoes(empresa.contexto_ia));
    }
    setEnableByok(empresa?.chave_api_configurada ?? false);
  }, [empresa]);

  const handleSave = async () => {
    if (!empresa?.id) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("empresas")
      .update({
        contexto_ia: { instrucoes: aiRules },
      })
      .eq("id", empresa.id);

    setIsSaving(false);

    if (error) {
      toast.error("Erro ao salvar configurações.");
      return;
    }

    await refreshProfile();
    toast.success("Configurações de IA salvas.");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do seu tenant
        </p>
        <Button variant="link" className="mt-2 h-auto p-0" asChild>
          <Link to="/dashboard/admin/colaboradores">
            <Users className="mr-2 h-4 w-4 inline" />
            Gerenciar colaboradores
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & BYOK
          </TabsTrigger>
          <TabsTrigger value="ai">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Configurações IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>BYOK - Bring Your Own Key</CardTitle>
              <CardDescription>
                Persistência criptografada da chave API será habilitada na Fase 3.
                Por enquanto, apenas a configuração de contexto IA é salva.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="byok-toggle" className="text-base font-medium">
                    Habilitar BYOK
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Utilize sua própria chave de API OpenAI
                  </p>
                </div>
                <Switch
                  id="byok-toggle"
                  checked={enableByok}
                  onCheckedChange={setEnableByok}
                  disabled
                />
              </div>

              {enableByok && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="api-key">Chave API OpenAI</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-input border-border font-mono"
                    disabled
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Regras e Comportamento da IA</CardTitle>
              <CardDescription>
                Defina instruções personalizadas para o assistente IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ai-rules">Instruções Customizadas</Label>
                <Textarea
                  id="ai-rules"
                  placeholder="Ex: Sempre seja formal e profissional..."
                  value={aiRules}
                  onChange={(e) => setAiRules(e.target.value)}
                  className="min-h-[200px] bg-input border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Salvo em empresas.contexto_ia (JSON) — usado pelo chat na Fase 4
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <RoleGate allowed={["admin", "master"]} title="Configurações restritas a administradores">
      <AdminContent />
    </RoleGate>
  );
}
