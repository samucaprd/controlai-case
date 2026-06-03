import type { ConversaResumo } from "./types";

/** Conversas mock por usuário — substituir por query Supabase (user_id = auth.uid()). */
export const mockConversas: ConversaResumo[] = [
  {
    id: "c1",
    userId: "user-master",
    titulo: "Análise de contrato NDA",
    agenteId: "1",
    atualizadoEm: "28/05/2026",
  },
  {
    id: "c2",
    userId: "user-master",
    titulo: "Fluxo de faturamento Q2",
    agenteId: "2",
    atualizadoEm: "27/05/2026",
  },
  {
    id: "c3",
    userId: "user-master",
    titulo: "Feedback roadmap produto",
    agenteId: "3",
    atualizadoEm: "26/05/2026",
  },
  {
    id: "c4",
    userId: "user-demo",
    titulo: "Atendimento cliente #4421",
    agenteId: "4",
    atualizadoEm: "25/05/2026",
  },
];
