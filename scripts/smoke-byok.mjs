/**
 * Smoke test Epic 3 — BYOK (manage-byok-key)
 *
 * Uso básico:
 *   pnpm smoke:byok
 *
 * Com admin autenticado + chave real OpenAI (opcional, testa save/rotate/remove):
 *   TEST_ADMIN_PASSWORD=<senha> TEST_OPENAI_API_KEY=sk-... pnpm smoke:byok
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
const openAiKey = process.env.TEST_OPENAI_API_KEY ?? "";

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

pass("env.local", "variáveis Supabase presentes");

const fnUrl = `${url}/functions/v1/manage-byok-key`;

// 1) Sem JWT de usuário → 401
try {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "validate", api_key: "sk-fake" }),
  });
  if (res.status === 401) pass("manage-byok-key 401 sem sessão");
  else fail("manage-byok-key 401 sem sessão", `status ${res.status}`);
} catch (e) {
  fail("manage-byok-key 401 sem sessão", String(e));
}

if (!adminPassword) {
  console.log("\n⚠ TEST_ADMIN_PASSWORD não definido — pulando testes autenticados.");
  console.log("  Defina TEST_ADMIN_PASSWORD e opcionalmente TEST_OPENAI_API_KEY para teste completo.");
  process.exit(results.every((r) => r.ok) ? 0 : 1);
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

const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData.session?.access_token;
if (!accessToken) {
  fail("sessão", "access_token ausente");
  process.exit(1);
}
pass("sessão", "access_token obtido");

async function invokeByok(body) {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// 2) Validar chave inválida → 400
{
  const { status, json } = await invokeByok({
    action: "validate",
    api_key: "sk-invalida-teste-smoke",
    provider: "openai",
  });
  if (status === 400 || json.code === "invalid_api_key" || json.error) {
    pass("validate chave inválida", json.error ?? `status ${status}`);
  } else {
    fail("validate chave inválida", JSON.stringify(json));
  }
}

if (!openAiKey) {
  console.log("\n⚠ TEST_OPENAI_API_KEY não definido — pulando save/rotate/remove.");
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

// 3) Remover chave existente (idempotente)
{
  const { status, json } = await invokeByok({ action: "remove" });
  if (status === 200 && json.success) pass("remove (cleanup)", json.message);
  else if (status === 200) pass("remove (cleanup)");
  else fail("remove (cleanup)", JSON.stringify(json));
}

// 4) Salvar chave válida
{
  const { status, json } = await invokeByok({ action: "save", api_key: openAiKey, provider: "openai" });
  if (status === 200 && json.success && json.configured) {
    pass("save chave", json.message);
  } else if (json.error?.includes("BYOK_ENCRYPTION_KEY")) {
    fail("save chave", "Configure BYOK_ENCRYPTION_KEY nos Secrets da Edge Function");
  } else {
    fail("save chave", JSON.stringify(json));
  }
}

// 5) Verificar empresas_public.chave_api_configurada
{
  const { data: perfil } = await supabase
    .from("perfis")
    .select("empresa_id")
    .eq("id", sessionData.session.user.id)
    .single();

  const { data: empresa } = await supabase
    .from("empresas_public")
    .select("chave_api_configurada")
    .eq("id", perfil.empresa_id)
    .single();

  if (empresa?.chave_api_configurada) pass("empresas_public", "chave_api_configurada=true");
  else fail("empresas_public", "chave_api_configurada=false");
}

// 6) Rotacionar (mesma chave no smoke)
{
  const { status, json } = await invokeByok({ action: "rotate", api_key: openAiKey, provider: "openai" });
  if (status === 200 && json.success) pass("rotate chave", json.message);
  else fail("rotate chave", JSON.stringify(json));
}

// 7) Validar sem persistir
{
  const { status, json } = await invokeByok({ action: "validate", api_key: openAiKey, provider: "openai" });
  if (status === 200 && json.valid) pass("validate chave válida");
  else fail("validate chave válida", JSON.stringify(json));
}

console.log("\n---");
const failed = results.filter((r) => !r.ok);
if (failed.length === 0) {
  console.log(`Todos os ${results.length} testes passaram.`);
  process.exit(0);
}
console.error(`${failed.length} teste(s) falharam.`);
process.exit(1);
