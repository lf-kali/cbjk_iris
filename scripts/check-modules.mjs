// npm run modules:check
// Simula o gerador desligando módulos numa cópia do projeto e confere que o
// resultado compila, gera o build e não deixa links para rotas removidas.
// Cenários: cada módulo sozinho e todos juntos. Use --keep para manter as cópias.
import { execFileSync } from "node:child_process";
import {
  cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readdirSync,
  readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync, copyFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadManifest, syncRegistry } from "./modules.mjs";

const ROOT = process.cwd();
const KEEP = process.argv.includes("--keep");
const SKIP = new Set(["node_modules", ".next", ".git"]);
const SOURCE_DIRS = ["app", "components", "lib", "types", "data", "themes"];

// node_modules por hardlink (rápido e sem ocupar espaço); cai para cópia entre discos.
function linkTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    const stat = lstatSync(from);
    if (stat.isSymbolicLink()) symlinkSync(readlinkSync(from), to);
    else if (stat.isDirectory()) linkTree(from, to);
    else {
      try { linkSync(from, to); } catch { copyFileSync(from, to); }
    }
  }
}

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? sourceFiles(p) : /\.(tsx?|mjs|css)$/.test(e.name) ? [p] : [];
  });
}

function htmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith(".html") ? [p] : [];
  });
}

function removeModules(dir, mods) {
  const configPath = path.join(dir, "site.config.ts");
  let config = readFileSync(configPath, "utf8");

  for (const mod of mods) {
    for (const p of mod.paths) rmSync(path.join(dir, p), { recursive: true, force: true });
    // o CLI vai escrever o site.config.ts do zero; aqui basta tirar as linhas do módulo
    for (const route of mod.menu) {
      config = config.replace(new RegExp(`^.*path: "${route}".*\\n`, "m"), "");
    }
    for (const type of Object.keys(mod.homeSections)) {
      config = config.replace(new RegExp(`\\{\\s*type: "${type}"[^}]*\\},?\\s*`, "g"), "");
    }
  }
  writeFileSync(configPath, config);
  syncRegistry(dir);
}

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: "pipe", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
}

function checkScenario(mods) {
  const label = mods.map((m) => m.id).join(" + ");
  const dir = mkdtempSync(path.join(os.tmpdir(), "modules-check-"));
  const problems = [];

  try {
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || src === ROOT });
    linkTree(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
    removeModules(dir, mods);

    // dependências do módulo não podem continuar importadas
    const deps = mods.flatMap((m) => m.dependencies);
    for (const file of SOURCE_DIRS.flatMap((d) => sourceFiles(path.join(dir, d)))) {
      const text = readFileSync(file, "utf8");
      for (const dep of deps) {
        if (text.includes(`"${dep}"`) || text.includes(`"${dep}/`)) {
          problems.push(`${path.relative(dir, file)} ainda importa ${dep}`);
        }
      }
    }

    for (const [cmd, args] of [["npx", ["tsc", "--noEmit"]], ["npx", ["next", "build"]]]) {
      try {
        run(cmd, args, dir);
      } catch (error) {
        const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n");
        problems.push(`${args.join(" ")} falhou:\n${out}`);
        break;
      }
    }

    // nenhum link para rota removida no HTML gerado
    if (!problems.length) {
      const routes = mods.flatMap((m) => m.paths.filter((p) => p.startsWith("app/")).map((p) => "/" + p.slice(4)));
      for (const file of htmlFiles(path.join(dir, ".next/server/app"))) {
        const html = readFileSync(file, "utf8");
        for (const route of routes) {
          if (html.includes(`href="${route}"`) || html.includes(`href="${route}/`)) {
            problems.push(`${path.relative(dir, file)} tem link para ${route}`);
          }
        }
      }
    }
  } finally {
    if (KEEP) console.log(`  cópia mantida em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  }

  return { label, problems };
}

const modules = loadManifest(ROOT);

if (!syncRegistry(ROOT, { check: true })) {
  console.error("components/home/sections.tsx está desatualizado. Rode: npm run modules:sync");
  process.exit(1);
}
for (const mod of modules) {
  for (const p of mod.paths) {
    if (!existsSync(path.join(ROOT, p))) console.warn(`aviso: ${mod.id} declara ${p}, que não existe`);
  }
}

const scenarios = [...modules.map((m) => [m]), modules];
let failed = false;

for (const mods of scenarios) {
  const started = Date.now();
  const { label, problems } = checkScenario(mods);
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  if (problems.length) {
    failed = true;
    console.log(`✗ sem ${label} (${secs}s)`);
    for (const p of problems) console.log("  - " + p.replace(/\n/g, "\n    "));
  } else {
    console.log(`✓ sem ${label} (${secs}s)`);
  }
}

process.exit(failed ? 1 : 0);
