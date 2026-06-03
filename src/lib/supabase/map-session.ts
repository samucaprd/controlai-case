import type { SessionUser } from "@/features/auth/types";
import type { EmpresaPublic, Perfil } from "./database.types";

export function mapPerfilToSessionUser(
  perfil: Perfil,
  empresa: EmpresaPublic,
): SessionUser {
  return {
    id: perfil.id,
    nome: perfil.nome_completo?.trim() || perfil.email,
    email: perfil.email,
    empresaId: String(perfil.empresa_id),
    empresaNome: empresa.nome?.trim() || "Empresa",
    role: perfil.role,
  };
}
