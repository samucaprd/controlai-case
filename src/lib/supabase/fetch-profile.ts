import { getSupabase } from "./client";
import type { EmpresaPublic, Perfil } from "./database.types";

export async function fetchProfileForUser(userId: string): Promise<{
  perfil: Perfil;
  empresa: EmpresaPublic;
}> {
  const supabase = getSupabase();

  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select(
      "id, empresa_id, role, email, nome_completo, status, avatar_url, ultimo_acesso",
    )
    .eq("id", userId)
    .single();

  if (perfilError || !perfil) {
    throw new Error(
      "Perfil não encontrado. Aguarde o provisionamento da conta.",
    );
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas_public")
    .select("*")
    .eq("id", perfil.empresa_id)
    .single();

  if (empresaError || !empresa) {
    throw new Error("Empresa não encontrada.");
  }

  return { perfil, empresa };
}
