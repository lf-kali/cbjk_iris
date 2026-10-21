// npm run e2e:docker -- <pasta> [flags do playwright]
// Roda o Playwright do apps/site dentro do container oficial, na mesma versão do @playwright/test
// instalado (SPEC §5.8: as capturas de __screenshots__ só são geradas aqui, para não depender da máquina).
// Exemplo: npm run e2e:docker -- baseline --update-snapshots
// Rode npm run build antes: o webServer do playwright.config.ts sobe o next start do build existente.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));
const { version } = require("@playwright/test/package.json");
const image = `mcr.microsoft.com/playwright:v${version}-noble`;

// mesmo usuário do host: as capturas gravadas no volume não ficam com dono root
const user = typeof process.getuid === "function" ? ["--user", `${process.getuid()}:${process.getgid()}`] : [];

const args = [
  "run", "--rm", "--init", "--ipc=host",
  ...user,
  "-e", "HOME=/tmp",
  "-e", "CI=1",
  "-e", "NEXT_TELEMETRY_DISABLED=1",
  "-v", `${ROOT}:/work`,
  "-w", "/work",
  image,
  "node", "node_modules/@playwright/test/cli.js", "test", "-c", "apps/site/playwright.config.ts",
  ...process.argv.slice(2),
];

console.error(`docker ${args.join(" ")}`);
const result = spawnSync("docker", args, { stdio: "inherit" });
if (result.error) {
  console.error(`Não consegui rodar o docker (${result.error.message}). Ele está instalado e no PATH? (${os.platform()})`);
  process.exit(1);
}
process.exit(result.status ?? 1);
