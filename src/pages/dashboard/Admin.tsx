import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Key, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

export default function Admin() {
  const [apiKey, setApiKey] = useState("");
  const [aiRules, setAiRules] = useState("");
  const [enableByok, setEnableByok] = useState(false);

  const handleSave = () => {
    // TODO: Implement save logic
    console.log("Settings saved");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do seu tenant
        </p>
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
                Use sua própria chave de API para maior controle e segurança
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua chave será criptografada e armazenada com segurança
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Informações de Uso</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Requisições este mês</p>
                    <p className="text-2xl font-bold mt-1">12,458</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Custo estimado</p>
                    <p className="text-2xl font-bold mt-1">R$ 245,00</p>
                  </div>
                </div>
              </div>
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
                  placeholder="Ex: Sempre seja formal e profissional. Utilize linguagem técnica quando apropriado..."
                  value={aiRules}
                  onChange={(e) => setAiRules(e.target.value)}
                  className="min-h-[200px] bg-input border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Estas instruções serão aplicadas a todas as conversas da sua empresa
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="font-medium">Configurações Avançadas</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Criativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Respostas mais variadas e criativas
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contexto Longo</Label>
                    <p className="text-sm text-muted-foreground">
                      Mantém histórico estendido de conversas
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Análise de Sentimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Detecta e adapta ao tom do usuário
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
