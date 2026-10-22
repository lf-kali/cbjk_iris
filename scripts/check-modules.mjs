// npm run modules:check  (na raiz do monorepo)
// Formato de transição da E2 (o mesmo de antes da migração, adaptado ao monorepo). Na E6 os cenários
// passam a trocar siteConfig.modules em vez de apagar rotas (SPEC §6, "npm run modules:check").
//
// 1. Isolamento no core: nenhum arquivo de packages/core/src fora de um módulo importa os arquivos
//    do módulo (modules.json, "corePaths") nem as dependências dele ("dependencies").
//    Nenhum arquivo do core importa o próprio core por "@cbjk_iris/core/..." (escaparia da checagem).
// 2. Para cada módulo desligado sozinho, e para todos juntos: copia apps/site para
//    apps/.modules-check-<cenário>/ (mesma profundidade, então tsconfig e @source continuam valendo),
//    apaga as rotas e o conteúdo do módulo, tira o menu do site.config.ts e grava nele os modules que
//    sobraram, tira as seções do módulo de content/home.json e content/pages/*.json, regenera o registro,
//    roda tsc e next build e confere que o HTML gerado não tem link para rota removida.
// Use --keep para manter as cópias.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { removeSectionsFromContent } from "./lib/modules-check-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "apps/site");
const CORE_SRC = path.join(ROOT, "packages/core/src");
const KEEP = process.argv.includes("--keep");
const SKIP = new Set(["node_modules", ".next", "test-results", "playwright-report"]);
const require = createRequire(path.join(SITE, "package.json"));
const BIN = { tsc: require.resolve("typescript/bin/tsc"), next: require.resolve("next/dist/bin/next") };

const { loadManifest, syncRegistry } = await import(pathToFileURL(path.join(SITE, "scripts/modules.mjs")).href);

function walk(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, pattern) : pattern.test(e.name) ? [p] : [];
  });
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

// caminho absoluto, sem extensão, de um import relativo (ou null se não for relativo)
function resolveRelative(file, spec) {
  if (!spec.startsWith(".")) return null;
  return path.resolve(path.dirname(file), spec).replace(/\.(tsx?|mjs|js)$/, "");
}

function belongsTo(absNoExt, corePaths) {
  return corePaths.some((p) => {
    const target = path.join(CORE_SRC, p).replace(/\.(tsx?)$/, "");
    return absNoExt === target || absNoExt.startsWith(target + path.sep);
  });
}

function checkCoreIsolation(modules) {
  const problems = [];
  for (const file of walk(CORE_SRC, /\.(tsx?)$/)) {
    const self = file.replace(/\.(tsx?)$/, "");
    const text = readFileSync(file, "utf8");
    // import do próprio core pelo nome do pacote escaparia da checagem por caminho relativo abaixo
    for (const [, spec] of text.matchAll(IMPORT_RE)) {
      if (spec === "@cbjk_iris/core" || spec.startsWith("@cbjk_iris/core/")) {
        problems.push(`${path.relative(ROOT, file)} importa ${spec}: dentro do core, use import relativo`);
      }
    }
    for (const mod of modules) {
      if (belongsTo(self, mod.corePaths)) continue;
      for (const [, spec] of text.matchAll(IMPORT_RE)) {
        const abs = resolveRelative(file, spec);
        if (abs && belongsTo(abs, mod.corePaths)) {
          problems.push(`${path.relative(ROOT, file)} importa ${spec}, que é do módulo ${mod.id}`);
        }
        if (mod.dependencies.some((dep) => spec === dep || spec.startsWith(`${dep}/`))) {
          problems.push(`${path.relative(ROOT, file)} importa ${spec}, dependência do módulo ${mod.id}`);
        }
      }
    }
  }
  return problems;
}

function removeModules(dir, mods, allModules) {
  const configPath = path.join(dir, "site.config.ts");
  let config = readFileSync(configPath, "utf8");
  for (const mod of mods) {
    for (const p of mod.paths) rmSync(path.join(dir, p), { recursive: true, force: true });
    // a CLI vai editar o site.config.ts com magicast; aqui basta tirar as linhas do módulo
    for (const route of mod.menu) {
      config = config.replace(new RegExp(`^.*path: "${route}".*\\n`, "m"), "");
    }
  }
  // siteConfig.modules = os que sobraram: os loaders recusam seção de módulo desligado
  const remaining = allModules.filter((m) => !mods.includes(m)).map((m) => JSON.stringify(m.id));
  if (/^\s*modules:/m.test(config)) throw new Error("site.config.ts já tem modules: o modules:check de transição não sabe editá-lo");
  config = config.replace(/^(\s*)currency: (.*)$/m, `$1currency: $2\n$1modules: [${remaining.join(", ")}],`);
  writeFileSync(configPath, config);
  removeSectionsFromContent(dir, mods.flatMap((m) => m.sections));
  syncRegistry(dir);
}

function run(bin, args, cwd) {
  execFileSync(process.execPath, [bin, ...args], {
    cwd,
    stdio: "pipe",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}

function routeOf(p) {
  return "/" + p.replace(/^app\/(\([^)]+\)\/)?/, "");
}

function checkScenario(mods) {
  const label = mods.map((m) => m.id).join(" + ");
  const dir = path.join(ROOT, "apps", `.modules-check-${mods.map((m) => m.id).join("-")}`);
  const problems = [];
  rmSync(dir, { recursive: true, force: true });
  try {
    cpSync(SITE, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || src === SITE });
    removeModules(dir, mods, modules);

    for (const [bin, args] of [[BIN.tsc, ["--noEmit", "-p", "tsconfig.json"]], [BIN.next, ["build"]]]) {
      try {
        run(bin, args, dir);
      } catch (error) {
        const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n");
        problems.push(`${path.basename(bin)} ${args.join(" ")} falhou:\n${out}`);
        break;
      }
    }

    // nenhum link para rota removida no HTML gerado
    if (!problems.length) {
      const routes = mods.flatMap((m) => m.paths.filter((p) => p.startsWith("app/")).map(routeOf));
      for (const file of walk(path.join(dir, ".next/server/app"), /\.html$/)) {
        const html = readFileSync(file, "utf8");
        for (const route of routes) {
          if (html.includes(`href="${route}"`) || html.includes(`href="${route}/`)) {
            problems.push(`${path.relative(dir, file)} tem link para ${route}`);
          }
        }
      }
    }
  } finally {
    if (KEEP) console.log(`  cópia mantida em ${path.relative(ROOT, dir)}`);
    else rmSync(dir, { recursive: true, force: true });
  }
  return { label, problems };
}

const modules = loadManifest(SITE);

if (!["schema", "engine"].every((p) => existsSync(path.join(ROOT, "packages", p, "dist")))) {
  console.error("Pacotes não compilados. Rode antes: npm run build:packages");
  process.exit(1);
}
if (!syncRegistry(SITE, { check: true })) {
  console.error("apps/site/app/iris.registry.generated.tsx está desatualizado. Rode: npm run modules:sync -w apps/site");
  process.exit(1);
}
for (const mod of modules) {
  for (const p of mod.paths) {
    if (!existsSync(path.join(SITE, p))) console.warn(`aviso: ${mod.id} declara ${p}, que não existe em apps/site`);
  }
  for (const p of mod.corePaths) {
    if (!existsSync(path.join(CORE_SRC, p))) console.warn(`aviso: ${mod.id} declara ${p}, que não existe em packages/core/src`);
  }
}

let failed = false;
const isolation = checkCoreIsolation(modules);
if (isolation.length) {
  failed = true;
  console.log("✗ isolamento dos módulos no core");
  for (const p of isolation) console.log("  - " + p);
} else {
  console.log("✓ isolamento dos módulos no core");
}

const scenarios = [...modules.map((m) => [m]), modules];
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
