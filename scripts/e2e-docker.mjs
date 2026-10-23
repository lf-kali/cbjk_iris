// npm run e2e:docker -- <pasta> [flags do playwright]
// Roda o Playwright do apps/site dentro do container oficial, na mesma versão do @playwright/test
// instalado, com a imagem fixada por digest (SPEC §5.8: as capturas de __screenshots__ só são geradas
// aqui, para não depender da máquina).
// Exemplo: npm run e2e:docker -- baseline --update-snapshots
// Rode npm run build antes: o webServer do playwright.config.ts sobe o next start do build existente.
//
// Isolamento (scripts/lib/e2e-docker.mjs): o repositório entra só para leitura; gravam no host só
// test-results e os __screenshots__ (sem link no caminho); o cache do next start fica em tmpfs. Sem
// capacidades do kernel, sem novos privilégios, sem rede (o servidor e o navegador usam o loopback do
// container), com limite de processos e de memória e com o usuário do host.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareRun } from "./lib/e2e-docker.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(path.join(ROOT, "apps/site/.next/BUILD_ID"))) {
  fail("Não achei o build do apps/site (apps/site/.next/BUILD_ID). Rode npm run build antes.");
}

let args;
try {
  args = prepareRun({ root: ROOT, version: require("@playwright/test/package.json").version, playwrightArgs: process.argv.slice(2) });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

console.error(`docker ${args.join(" ")}`);
const result = spawnSync("docker", args, { stdio: "inherit" });
if (result.error) {
  fail(`Não consegui rodar o docker (${result.error.message}). Ele está instalado e no PATH? (${os.platform()})`);
}
process.exit(result.status ?? 1);
