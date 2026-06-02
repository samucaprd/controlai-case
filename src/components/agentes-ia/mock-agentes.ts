import { Briefcase, Rocket, Settings, Shield, ShoppingCart } from "lucide-react";
import { AGENTE_COR_OPTIONS, AGENTE_ICON_OPTIONS } from "./constants";
import type { AgenteIA } from "./types";

function buildAgente(
  partial: Omit<AgenteIA, "icone" | "corClasse">,
): AgenteIA {
  const icone = AGENTE_ICON_OPTIONS.find((i) => i.id === partial.iconeId)!.icon;
  const corClasse = AGENTE_COR_OPTIONS.find((c) => c.id === partial.corId)!.classe;
  return { ...partial, icone, corClasse };
}

/** Dados estáticos para layout — substituir por Supabase na integração. */
export const mockAgentesIA: AgenteIA[] = [
  buildAgente({
    id: "1",
    nome: "Jurídico",
    descricao: "Compliance, Contratos e Privacidade",
    instrucoes:
      "Você é um assistente jurídico. Responda com linguagem formal, cite compliance e privacidade quando relevante.",
    iconeId: "shield",
    corId: "pink",
    is_active: true,
    is_popular: false,
    criadoEm: "23/10/2025",
  }),
  buildAgente({
    id: "2",
    nome: "Financeiro",
    descricao: "Contas a Pagar/Receber, Faturamento",
    instrucoes:
      "Você é um assistente financeiro. Foque em clareza numérica, faturamento e contas a pagar/receber.",
    iconeId: "briefcase",
    corId: "orange",
    is_active: true,
    is_popular: false,
    criadoEm: "23/10/2025",
  }),
  buildAgente({
    id: "3",
    nome: "Produto",
    descricao: "Gestão de Requisitos e Feedback",
    instrucoes:
      "Você apoia gestão de produto. Priorize requisitos, feedback de usuários e roadmap.",
    iconeId: "settings",
    corId: "purple",
    is_active: true,
    is_popular: true,
    criadoEm: "23/10/2025",
  }),
  buildAgente({
    id: "4",
    nome: "Customer Service",
    descricao: "Suporte Técnico e Atendimento ao Cliente",
    instrucoes:
      "Você é suporte ao cliente. Seja empático, objetivo e orientado à resolução de problemas.",
    iconeId: "cart",
    corId: "blue",
    is_active: true,
    is_popular: true,
    criadoEm: "23/10/2025",
  }),
  buildAgente({
    id: "5",
    nome: "Comercial",
    descricao: "Comercial (Vendas e Pré-vendas)",
    instrucoes:
      "Você apoia vendas e pré-vendas. Destaque benefícios, objeções e próximos passos comerciais.",
    iconeId: "rocket",
    corId: "emerald",
    is_active: true,
    is_popular: true,
    criadoEm: "23/10/2025",
  }),
];
