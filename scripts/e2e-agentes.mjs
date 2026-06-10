/**
 * E2E browser — Agentes IA (Playwright)
 * TEST_ADMIN_PASSWORD=<senha> node scripts/e2e-agentes.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? "samul.moreira2006@gmail.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "";

const results = [];
const consoleErrors = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!adminPassword) {
  fail("credenciais", "TEST_ADMIN_PASSWORD não definido");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});

page.on("pageerror", (err) => {
  consoleErrors.push(err.message);
});

try {
  // Login
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await page.fill("#email", adminEmail);
  await page.fill("#password", adminPassword);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  pass("login", adminEmail);

  // Agentes IA
  await page.goto(`${BASE}/dashboard/agentes-ia`, { waitUntil: "networkidle" });
  pass("navegação", "/dashboard/agentes-ia");

  // Cleanup agentes E2E anteriores
  const cards = page.locator('[class*="border-border"][class*="bg-card"]');
  while (await page.getByRole("button", { name: /Excluir agente E2E/i }).count()) {
    await page.getByRole("button", { name: /Excluir agente E2E/i }).first().click();
    await page.getByRole("button", { name: /^Excluir$/ }).click();
    await page.waitForTimeout(800);
  }

  // 1) Cadastrar
  await page.getByRole("button", { name: /Novo Agente/i }).click();
  await page.waitForSelector("#agente-nome");
  await page.fill("#agente-nome", "E2E Test Agente");
  await page.fill("#agente-descricao", "Descrição do teste E2E");
  await page.fill("#agente-contexto", "Contexto de teste automatizado via browser.");
  await page.getByRole("button", { name: /Salvar agente/i }).click();
  await page.waitForSelector("text=E2E Test Agente", { timeout: 10000 });
  pass("cadastrar agente");

  // 2) Editar
  await page.getByRole("button", { name: /Editar agente E2E Test Agente/i }).click();
  await page.fill("#agente-nome", "E2E Test Editado");
  await page.getByRole("button", { name: /Salvar alterações/i }).click();
  await page.waitForSelector("text=E2E Test Editado", { timeout: 10000 });
  pass("editar agente");

  // 3) Excluir
  await page.getByRole("button", { name: /Excluir agente E2E Test Editado/i }).click();
  await page.getByRole("button", { name: /^Excluir$/ }).click();
  await page.waitForTimeout(1000);
  const stillVisible = await page.getByText("E2E Test Editado").count();
  if (stillVisible === 0) pass("excluir agente");
  else fail("excluir agente", "card ainda visível");

  // 4) Limite do plano Free (máx. 2)
  const novoBtn = page.getByRole("button", { name: /Novo Agente/i });

  await novoBtn.click();
  await page.fill("#agente-nome", "E2E Limite 1");
  await page.getByRole("button", { name: /Salvar agente/i }).click();
  await page.waitForSelector("text=E2E Limite 1", { timeout: 10000 });

  await novoBtn.click();
  await page.fill("#agente-nome", "E2E Limite 2");
  await page.getByRole("button", { name: /Salvar agente/i }).click();
  await page.waitForSelector("text=E2E Limite 2", { timeout: 10000 });
  pass("cadastrar 2 agentes (limite Free)");

  const disabled = await novoBtn.isDisabled();
  if (disabled) {
    pass("botão Novo Agente desabilitado no limite");
  } else {
    await novoBtn.click();
    const toastLimit = await page.getByText(/Limite do plano/i).count();
    if (toastLimit > 0) pass("toast de limite ao tentar 3º agente");
    else fail("limite do plano", "botão ativo e sem toast de limite");
  }

  // Cleanup
  for (const name of ["E2E Limite 1", "E2E Limite 2"]) {
    const del = page.getByRole("button", { name: new RegExp(`Excluir agente ${name}`) });
    if (await del.count()) {
      await del.click();
      await page.getByRole("button", { name: /^Excluir$/ }).click();
      await page.waitForTimeout(600);
    }
  }
  pass("cleanup agentes E2E");
} catch (err) {
  fail("e2e exceção", err instanceof Error ? err.message : String(err));
  await page.screenshot({ path: "e2e-agentes-failure.png", fullPage: true });
  console.log("Screenshot salvo: e2e-agentes-failure.png");
} finally {
  await browser.close();
}

console.log("\n--- Console errors ---");
if (consoleErrors.length === 0) {
  console.log("(nenhum erro no console)");
} else {
  consoleErrors.forEach((e) => console.log(`  • ${e}`));
}

console.log("\n---");
const failed = results.filter((r) => !r.ok);
if (failed.length === 0) {
  console.log(`Todos os ${results.length} passos passaram.`);
  process.exit(0);
}
console.error(`${failed.length} passo(s) falharam.`);
process.exit(1);
