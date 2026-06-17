/**
 * Sincroniza secrets das Edge Functions a partir de .env.local (fonte única local).
 * Uso: pnpm sync:secrets
 * Requer SUPABASE_ACCESS_TOKEN (supabase login ou variável de ambiente).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const PROJECT_REF = "hrzsdiduafuqtxitpgoy";

/** [chave em .env.local, nome do secret no Supabase] */
const SECRET_MAP = [
  ["STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY"],
  ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET"],
  ["VITE_PUBLIC_URL", "SITE_URL"],
  ["BYOK_ENCRYPTION_KEY", "BYOK_ENCRYPTION_KEY"],
  ["BREVO_API_KEY", "BREVO_API_KEY"],
  ["BREVO_SENDER_EMAIL", "BREVO_SENDER_EMAIL"],
  ["BREVO_SENDER_NAME", "BREVO_SENDER_NAME"],
];

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

function run(cmd, args, env = process.env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, env });
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error(
      "Defina SUPABASE_ACCESS_TOKEN (supabase login ou token do dashboard).",
    );
    process.exit(1);
  }

  const local = loadEnvLocal();
  const pairs = [];

  for (const [localKey, secretName] of SECRET_MAP) {
    const value = local[localKey];
    if (value) pairs.push(`${secretName}=${value}`);
  }

  if (pairs.length === 0) {
    console.error("Nenhum secret encontrado em .env.local");
    process.exit(1);
  }

  console.log(`▶ Sincronizando ${pairs.length} secret(s) de .env.local → Supabase...`);
  for (const p of pairs) {
    const name = p.split("=")[0];
    console.log(`  • ${name}`);
  }

  await run("pnpm", [
    "dlx",
    "supabase",
    "secrets",
    "set",
    ...pairs,
    "--project-ref",
    PROJECT_REF,
  ]);

  console.log("\n✓ Secrets das Edge Functions atualizados a partir de .env.local");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
