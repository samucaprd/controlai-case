import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Colaborador() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou seu assistente IA. Como posso ajudar você hoje?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInput("");

    // Simular resposta da IA
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Esta é uma resposta simulada da IA. Integre com sua API de IA preferida para funcionalidade completa.",
        timestamp: new Date()
      }]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chat com IA</h1>
        <p className="text-muted-foreground mt-2">
          Converse com seu assistente inteligente
        </p>
      </div>

      <div className="grid h-[calc(100%-5rem)] gap-6 lg:grid-cols-12">
        {/* Chat History Sidebar */}
        <Card className="border-border lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-2">
                {["Conversa 1", "Conversa 2", "Conversa 3", "Conversa 4"].map((chat, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    {chat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="border-border lg:col-span-9">
          <CardContent className="p-0 flex flex-col h-full">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      message.role === "user" 
                        ? "bg-primary" 
                        : "bg-muted"
                    }`}>
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 space-y-2 ${
                      message.role === "user" ? "text-right" : ""
                    }`}>
                      <div className={`inline-block rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        {message.content}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="min-h-[80px] bg-input border-border resize-none"
                />
                <Button
                  onClick={handleSend}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
