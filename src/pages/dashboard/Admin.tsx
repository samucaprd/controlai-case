import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Users } from "lucide-react";
import { useState } from "react";
import { RoleGate } from "@/features/auth/role-gate";
import { AdminUsuariosTab } from "@/components/admin/admin-usuarios-tab";

function AdminContent() {
  const [apiKey, setApiKey] = useState("");
  const [enableByok, setEnableByok] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do seu tenant
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & BYOK
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>BYOK - Bring Your Own Key</CardTitle>
              <CardDescription>
                Persistência criptografada da chave API será habilitada na Fase 3.
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
                <div className="space-y-2 border-t border-border pt-4">
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

        <TabsContent value="usuarios">
          <AdminUsuariosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Admin() {
  return (
    <RoleGate
      allowed={["admin", "master"]}
      title="Configurações restritas a administradores"
      redirectTo="/dashboard/colaborador"
    >
      <AdminContent />
    </RoleGate>
  );
}
