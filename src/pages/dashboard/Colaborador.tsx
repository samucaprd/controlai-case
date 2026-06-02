import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgenteQuickCard } from "@/components/chat/agente-quick-card";
import { useChat } from "@/features/chat/chat-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Colaborador() {
  const {
    user,
    agentes,
    agentesPopulares,
    selectedAgenteId,
    setSelectedAgenteId,
  } = useChat();
  const [prompt, setPrompt] = useState("");
  const [agentesOpen, setAgentesOpen] = useState(true);

  const primeiroNome = user.nome.split(" ")[0];

  const handleSend = () => {
    if (!prompt.trim()) return;
    if (!selectedAgenteId) {
      toast.message("Selecione um agente antes de enviar.");
      setAgentesOpen(true);
      return;
    }
    toast.success("Prompt enviado (layout) — chat completo na Fase 4.");
    setPrompt("");
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-4">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Olá,{" "}
          <span className="bg-hero-gradient bg-clip-text text-transparent">
            {primeiroNome}
          </span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          ControlIA para {user.empresaNome}
        </p>
      </header>

      {agentesPopulares.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Agentes Populares
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {agentesPopulares.map((agente) => (
              <AgenteQuickCard
                key={agente.id}
                agente={agente}
                compact
                selected={selectedAgenteId === agente.id}
                onSelect={() => setSelectedAgenteId(agente.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="relative">
        <Textarea
          placeholder="Insira um comando para o ControlIA"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="min-h-[120px] resize-none border-border bg-card pr-14 text-base"
        />
        <Button
          type="button"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
          onClick={handleSend}
          aria-label="Enviar prompt"
        >
          <Send className="h-4 w-4" />
        </Button>
      </section>

      <Collapsible open={agentesOpen} onOpenChange={setAgentesOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              agentesOpen && "rotate-180",
            )}
          />
          Escolha um Agente
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Selecione um Agente
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentes.map((agente) => (
                <AgenteQuickCard
                  key={agente.id}
                  agente={agente}
                  selected={selectedAgenteId === agente.id}
                  onSelect={() => setSelectedAgenteId(agente.id)}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
