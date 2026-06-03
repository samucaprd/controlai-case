/**
 * Smoke test: Supabase + invite-tenant-user
 * Uso: pnpm exec node scripts/smoke-supabase.mjs
 * Convite autenticado: TEST_ADMIN_PASSWORD=<senha> pnpm exec node scripts/smoke-supabase.mjs
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
const adminEmail =
  process.env.TEST_ADMIN_EMAIL ?? "samul.moreira2006@gmail.com";
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

pass("env.local", "variáveis Supabase presentes");

const supabase = createClient(url, anonKey);

// 1) Edge function sem JWT de usuário → 401
try {
  const res = await fetch(`${url}/functions/v1/invite-tenant-user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "smoke-nao-usar@example.com",
      nome_completo: "Smoke Test",
      role: "user",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    pass("invite-tenant-user sem sessão", "401 Unauthorized (esperado)");
  } else {
    fail(
      "invite-tenant-user sem sessão",
      `status ${res.status}: ${JSON.stringify(body)}`,
    );
  }
} catch (e) {
  fail("invite-tenant-user sem sessão", e instanceof Error ? e.message : String(e));
}

// 2) RLS: anon não lista perfis
const { data: anonPerfis, error: anonError } = await supabase
  .from("perfis")
  .select("id")
  .limit(1);

if (!anonError && (anonPerfis?.length ?? 0) === 0) {
  pass("RLS perfis (anon)", "0 linhas — RLS ativo");
} else if (anonError) {
  pass("RLS perfis (anon)", `bloqueado: ${anonError.message}`);
} else {
  fail("RLS perfis (anon)", `retornou ${anonPerfis?.length} linha(s)`);
}

// 3) Login + convite (se senha informada)
if (!adminPassword) {
  console.log(
    "\n⚠ TEST_ADMIN_PASSWORD não definido — pulando login e convite autenticado.",
  );
  console.log(
    "  Para testar convite: TEST_ADMIN_PASSWORD=sua_senha pnpm exec node scripts/smoke-supabase.mjs\n",
  );
} else {
  const { data: signIn, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

  if (signInError || !signIn.session) {
    fail("login admin", signInError?.message ?? "sem sessão");
  } else {
    pass("login admin", adminEmail);

    const sessionClient = createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${signIn.session.access_token}` },
      },
    });

    const { data: perfil } = await sessionClient
      .from("perfis")
      .select("id, role, empresa_id")
      .eq("id", signIn.user.id)
      .single();

    if (perfil?.role === "admin" || perfil?.role === "master") {
      pass("perfil admin/master", `role=${perfil.role} empresa_id=${perfil.empresa_id}`);
    } else {
      fail("perfil admin/master", `role=${perfil?.role ?? "null"}`);
    }

    const dupEmail = adminEmail;
    const { data: dupData, error: dupFnError } = await sessionClient.functions.invoke(
      "invite-tenant-user",
      {
        body: {
          email: dupEmail,
          nome_completo: "Duplicado Teste",
          role: "user",
        },
      },
    );

    const dupPayload = dupData ?? {};
    const dupErrMsg = dupFnError?.message ?? dupPayload.error ?? "";
    if (
      dupPayload.code === "EMAIL_EXISTS" ||
      dupErrMsg.includes("já") ||
      dupErrMsg.includes("cadastrado")
    ) {
      pass("validação e-mail duplicado", dupPayload.error ?? dupErrMsg);
    } else if (dupFnError) {
      fail("validação e-mail duplicado", dupFnError.message);
    } else {
      fail(
        "validação e-mail duplicado",
        `resposta inesperada: ${JSON.stringify(dupPayload)}`,
      );
    }

    const inviteEmail = `smoke.invite.${Date.now()}@example.com`;
    const { data: invData, error: invFnError } =
      await sessionClient.functions.invoke("invite-tenant-user", {
        body: {
          email: inviteEmail,
          nome_completo: "Usuário Smoke Test",
          role: "user",
        },
      });

    const invPayload = invData ?? {};
    if (invFnError) {
      fail("enviar convite", invFnError.message);
    } else if (invPayload.success) {
      pass("enviar convite", `${inviteEmail} — ${invPayload.message ?? "ok"}`);
    } else {
      fail("enviar convite", JSON.stringify(invPayload));
    }

    await supabase.auth.signOut();
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n--- ${results.length - failed}/${results.length} testes OK ---`);
process.exit(failed > 0 ? 1 : 0);
