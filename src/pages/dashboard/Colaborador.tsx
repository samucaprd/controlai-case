import { useRef, useEffect, useState } from "react";
import { ChevronDown, Loader2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgenteQuickCard } from "@/components/chat/agente-quick-card";
import { useChat } from "@/features/chat/chat-context";
import { useSession } from "@/features/auth/session-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Colaborador() {
  const {
    user,
    agentes,
    agentesPopulares,
    messages,
    selectedAgenteId,
    setSelectedAgenteId,
    sendMessage,
    isSending,
    byokReady,
    usage,
    selectedConversaId,
  } = useChat();
  const { isMaster } = useSession();

  const [prompt, setPrompt] = useState("");
  const [agentesOpen, setAgentesOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const primeiroNome = user.nome.split(" ")[0];
  const hasThread = messages.length > 0;
  const showWelcome = !hasThread && !selectedConversaId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!prompt.trim() || isSending) return;
    if (!selectedAgenteId) {
      toast.message("Selecione um agente antes de enviar.");
      setAgentesOpen(true);
      return;
    }

    const text = prompt;
    setPrompt("");
    try {
      await sendMessage(text);
    } catch {
      setPrompt(text);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      {!byokReady && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chat indisponível</AlertTitle>
          <AlertDescription>
            O administrador precisa habilitar o BYOK e cadastrar a chave API da LLM em
            Configurações → API &amp; BYOK.
          </AlertDescription>
        </Alert>
      )}

      {usage && (
        <p className="text-center text-xs text-muted-foreground">
          {isMaster || (usage.limit === 0 && usage.remaining < 0)
            ? `Mensagens este mês: ${usage.used} (ilimitado — Master)`
            : `Mensagens este mês: ${usage.used}/${usage.limit}${
                usage.remaining === 0 ? " — limite atingido" : ""
              }`}
        </p>
      )}

      {showWelcome && (
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
      )}

      {showWelcome && agentesPopulares.length > 0 && (
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

      {hasThread && (
        <section className="flex max-h-[min(55vh,520px)] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card/40 p-4">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted/50 text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Agente respondendo…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>
      )}

      <section className="relative">
        <Textarea
          placeholder={
            byokReady
              ? "Insira um comando para o ControlIA"
              : "Configure o BYOK para usar o chat"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={!byokReady || isSending}
          className="min-h-[120px] resize-none border-border bg-card pr-14 text-base"
        />
        <Button
          type="button"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
          onClick={() => void handleSend()}
          disabled={!byokReady || isSending || !prompt.trim()}
          aria-label="Enviar prompt"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
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
          {selectedAgenteId && (
            <span className="text-primary">
              — {agentes.find((a) => a.id === selectedAgenteId)?.nome}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="rounded-xl border border-border bg-card/50 p-4">
            {agentes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Nenhum agente ativo. O administrador deve cadastrar agentes em Agentes IA.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
