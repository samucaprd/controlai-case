export const LLM_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    hint: "Compatível com API OpenAI (Chat Completions).",
    available: true,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    hint: "Claude via API Anthropic.",
    available: true,
  },
  {
    id: "google",
    label: "Google Gemini",
    placeholder: "AIza...",
    hint: "Em breve — validação completa na Fase 4.",
    available: false,
  },
  {
    id: "azure_openai",
    label: "Azure OpenAI",
    placeholder: "Chave do recurso Azure",
    hint: "Em breve — validação completa na Fase 4.",
    available: false,
  },
] as const;

export type LlmProviderId = (typeof LLM_PROVIDERS)[number]["id"];

export function isLlmProviderId(value: unknown): value is LlmProviderId {
  return LLM_PROVIDERS.some((p) => p.id === value);
}

export function getLlmProvider(id: LlmProviderId) {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
}
