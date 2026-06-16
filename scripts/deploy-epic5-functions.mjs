/**
 * Deploy Epic 5 edge functions (requires `supabase login` or SUPABASE_ACCESS_TOKEN).
 * Usage: pnpm deploy:epic5
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawn } from "node:child_process";

const PROJECT_REF = "hrzsdiduafuqtxitpgoy";
const ROOT = join(import.meta.dirname, "..", "supabase", "functions");

const FUNCTIONS = [
  "invite-tenant-user",
  "delete-tenant-user",
  "request-password-reset",
  "complete-password-reset",
  "send-welcome-email",
  "notify-invite-accepted",
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function main() {
  for (const name of FUNCTIONS) {
    console.log(`\n▶ Deploying ${name}...`);
    const verifyJwt =
      name === "request-password-reset" || name === "complete-password-reset"
        ? "false"
        : "true";
    await run("pnpm", [
      "dlx",
      "supabase",
      "functions",
      "deploy",
      name,
      "--project-ref",
      PROJECT_REF,
      ...(verifyJwt === "false" ? ["--no-verify-jwt"] : []),
    ]);
  }
  console.log("\n✓ Epic 5 functions deployed.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
