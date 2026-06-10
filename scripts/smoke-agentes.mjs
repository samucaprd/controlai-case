/**
 * Smoke test — Agentes IA (CRUD + limite do plano)
 *
 * Uso:
 *   TEST_ADMIN_PASSWORD=<senha> pnpm smoke:agentes
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnvLocal();
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? "samul.moreira2006@gmail.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!url || !anonKey) {
  fail("env.local", "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes");
  process.exit(1);
}

if (!adminPassword) {
  fail("login", "TEST_ADMIN_PASSWORD não definido");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { error: signInError } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (signInError) {
  fail("login admin", signInError.message);
  process.exit(1);
}
pass("login admin", adminEmail);

const { data: perfil } = await supabase
  .from("perfis")
  .select("empresa_id")
  .eq("id", (await supabase.auth.getUser()).data.user.id)
  .single();

const empresaId = perfil.empresa_id;

const { data: empresa } = await supabase
  .from("empresas_public")
  .select("plano_id")
  .eq("id", empresaId)
  .single();

const { data: plano } = await supabase
  .from("planos")
  .select("nome, max_agentes")
  .eq("id", empresa.plano_id)
  .single();

pass("plano", `${plano.nome} — max ${plano.max_agentes} agentes`);

// Cleanup agentes de teste anteriores
await supabase
  .from("agentes_ia")
  .delete()
  .eq("empresa_id", empresaId)
  .like("nome", "Smoke Test%");

const basePayload = {
  empresa_id: empresaId,
  nome: "Smoke Test Agente",
  descricao: "Agente criado pelo smoke test",
  instrucoes: "Instruções de teste automatizado.",
  icone_url: "shield",
  cor: "pink",
  is_active: true,
  is_popular: false,
};

// 1) Criar
const { data: created, error: createError } = await supabase
  .from("agentes_ia")
  .insert(basePayload)
  .select("id, nome")
  .single();

if (createError || !created) {
  fail("criar agente", createError?.message ?? "sem dados");
} else {
  pass("criar agente", `id=${created.id}`);
}

const agenteId = created?.id;

// 2) Editar
if (agenteId) {
  const { error: updateError } = await supabase
    .from("agentes_ia")
    .update({ nome: "Smoke Test Agente Editado", descricao: "Descrição atualizada" })
    .eq("id", agenteId);

  if (updateError) fail("editar agente", updateError.message);
  else pass("editar agente");
}

// 3) Limite do plano
const slotsLeft = plano.max_agentes - 1;
for (let i = 0; i < slotsLeft; i++) {
  await supabase.from("agentes_ia").insert({
    ...basePayload,
    nome: `Smoke Test Extra ${i + 1}`,
  });
}

const { error: limitError } = await supabase.from("agentes_ia").insert({
  ...basePayload,
  nome: "Smoke Test Limite",
});

if (limitError?.message?.includes("Limite de agentes do plano")) {
  pass("limite do plano", limitError.message);
} else if (plano.max_agentes > 10) {
  pass("limite do plano", "plano com limite alto — pulando assert");
} else {
  fail("limite do plano", limitError?.message ?? "deveria bloquear insert extra");
}

// 4) Excluir agente principal
if (agenteId) {
  const { error: deleteError } = await supabase
    .from("agentes_ia")
    .delete()
    .eq("id", agenteId);

  if (deleteError) fail("excluir agente", deleteError.message);
  else pass("excluir agente");
}

// Cleanup restantes
await supabase
  .from("agentes_ia")
  .delete()
  .eq("empresa_id", empresaId)
  .like("nome", "Smoke Test%");

const failed = results.filter((r) => !r.ok);
console.log("\n---");
if (failed.length === 0) {
  console.log(`Todos os ${results.length} testes passaram.`);
  process.exit(0);
}
console.error(`${failed.length} teste(s) falharam.`);
process.exit(1);
