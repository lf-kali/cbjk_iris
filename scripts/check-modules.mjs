// npm run modules:check  (na raiz do monorepo). SPEC §6, "npm run modules:check".
//
// 1. Isolamento no core: nenhum arquivo de packages/core/src fora de um módulo importa os arquivos do
//    módulo (CORE_PATHS) nem as dependências dele (DEPENDENCIES). Nenhum arquivo do core importa o
//    próprio core por "@cbjk_iris/core/..." (escaparia da checagem).
// 2. Matriz de 4 cenários (cada módulo desligado, um de cada vez, e todos desligados): copia apps/site
//    para apps/.modules-check-<cenário>/ (mesma profundidade, então tsconfig e @source continuam
//    valendo), grava em siteConfig.modules os que sobraram, tira o menu do módulo, tira as seções do
//    módulo de content/home.json e content/pages/*.json e roda o Sync do engine, que apaga as rotas do
//    módulo e regenera o registro. Confere que as rotas geradas do módulo sumiram, roda tsc e next build,
//    confere que o build não gerou página para rota do módulo e que o HTML não tem link para ela.
// Use --keep para manter as cópias.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeSectionsFromContent } from "./lib/modules-check-content.mjs";
import { builtRouteProblems, copyDirFor, generatedRouteProblems, removeCopy, removeMenuRoutes, setModules } from "./lib/modules-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "apps/site");
const CORE_SRC = path.join(ROOT, "packages/core/src");
const KEEP = process.argv.includes("--keep");
const SKIP = new Set(["node_modules", ".next", "test-results", "playwright-report"]);
const require = createRequire(path.join(SITE, "package.json"));
const BIN = { tsc: require.resolve("typescript/bin/tsc"), next: require.resolve("next/dist/bin/next") };

// Arquivos de cada módulo dentro de packages/core/src, e dependências npm que só o módulo usa.
// Só servem ao teste de isolamento (antes ficavam no apps/site/modules.json, que saiu na E6a).
const CORE_PATHS = {
  products: ["app/products", "products", "catalog/products.ts", "sections/products.tsx"],
  services: ["app/services", "services", "catalog/services.ts", "sections/services.tsx"],
  gallery: ["app/gallery", "gallery", "sections/gallery.tsx"],
};
const DEPENDENCIES = { products: [], services: [], gallery: ["image-size", "react-photo-album"] };

if (!["schema", "engine"].every((p) => existsSync(path.join(ROOT, "packages", p, "dist")))) {
  console.error("Pacotes não compilados. Rode antes: npm run build:packages");
  process.exit(1);
}
const { MODULES, sectionsOfModule } = await import("@cbjk_iris/schema");
const { sync, formatDiagnostic, ROUTE_PAGES } = await import("@cbjk_iris/engine");

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

function checkCoreIsolation() {
  const problems = [];
  for (const file of walk(CORE_SRC, /\.(tsx?)$/)) {
    const self = file.replace(/\.(tsx?)$/, "");
    const text = readFileSync(file, "utf8");
    for (const [, spec] of text.matchAll(IMPORT_RE)) {
      if (spec === "@cbjk_iris/core" || spec.startsWith("@cbjk_iris/core/")) {
        problems.push(`${path.relative(ROOT, file)} importa ${spec}: dentro do core, use import relativo`);
      }
    }
    for (const mod of MODULES) {
      if (belongsTo(self, CORE_PATHS[mod.id])) continue;
      for (const [, spec] of text.matchAll(IMPORT_RE)) {
        const abs = resolveRelative(file, spec);
        if (abs && belongsTo(abs, CORE_PATHS[mod.id])) {
          problems.push(`${path.relative(ROOT, file)} importa ${spec}, que é do módulo ${mod.id}`);
        }
        if (DEPENDENCIES[mod.id].some((dep) => spec === dep || spec.startsWith(`${dep}/`))) {
          problems.push(`${path.relative(ROOT, file)} importa ${spec}, dependência do módulo ${mod.id}`);
        }
      }
    }
  }
  return problems;
}

function syncProblems(dir, check) {
  const result = sync(dir, { check });
  const errors = result.diagnostics.filter((d) => d.level === "error").map(formatDiagnostic);
  if (check && !result.upToDate && !errors.length) errors.push(`desatualizado: ${result.changed.join(", ")}`);
  return errors;
}

function disableModules(dir, off) {
  const configPath = path.join(dir, "site.config.ts");
  const remaining = MODULES.filter((m) => !off.includes(m)).map((m) => m.id);
  let config = setModules(readFileSync(configPath, "utf8"), remaining);
  config = removeMenuRoutes(config, off.flatMap((m) => m.menu));
  writeFileSync(configPath, config);
  removeSectionsFromContent(dir, off.flatMap((m) => sectionsOfModule(m.id)));
  return syncProblems(dir, false);
}

function run(bin, args, cwd) {
  execFileSync(process.execPath, [bin, ...args], {
    cwd,
    stdio: "pipe",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}

// rotas públicas do módulo: "produto/[slug]" -> "/produto"
const publicRoutes = (mods) => [...new Set(mods.flatMap((m) => m.routes.map((r) => `/${r.split("/")[0]}`)))];

function buildProblems(dir) {
  for (const [bin, args] of [[BIN.tsc, ["--noEmit", "-p", "tsconfig.json"]], [BIN.next, ["build"]]]) {
    try {
      run(bin, args, dir);
    } catch (error) {
      const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n");
      return [`${path.basename(bin)} ${args.join(" ")} falhou:\n${out}`];
    }
  }
  return [];
}

function linkProblems(dir, off) {
  const problems = [];
  const routes = publicRoutes(off);
  for (const file of walk(path.join(dir, ".next/server/app"), /\.html$/)) {
    const html = readFileSync(file, "utf8");
    for (const route of routes) {
      if (html.includes(`href="${route}"`) || html.includes(`href="${route}/`)) {
        problems.push(`${path.relative(dir, file)} tem link para ${route}`);
      }
    }
  }
  return problems;
}

function checkScenario(off) {
  const label = off.map((m) => m.id).join(" + ");
  const dir = copyDirFor(ROOT, off.map((m) => m.id));
  let problems = [];
  removeCopy(ROOT, dir);
  try {
    cpSync(SITE, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || src === SITE });
    const offIds = off.map((m) => m.id);
    problems = disableModules(dir, off);
    // o sync precisa ter apagado as rotas do módulo: sem isso, o cenário não prova nada
    if (!problems.length) problems = generatedRouteProblems(dir, ROUTE_PAGES, offIds);
    if (!problems.length) problems = buildProblems(dir);
    if (!problems.length) problems = builtRouteProblems(dir, ROUTE_PAGES, offIds);
    if (!problems.length) problems = linkProblems(dir, off);
  } finally {
    if (KEEP) console.log(`  cópia mantida em ${path.relative(ROOT, dir)}`);
    else removeCopy(ROOT, dir);
  }
  return { label, problems };
}

const stale = syncProblems(SITE, true);
if (stale.length) {
  console.error(`apps/site não está em dia com o sync:\n- ${stale.join("\n- ")}\nRode: npm run sync -w apps/site`);
  process.exit(1);
}
for (const [id, paths] of Object.entries(CORE_PATHS)) {
  for (const p of paths) {
    if (!existsSync(path.join(CORE_SRC, p))) console.warn(`aviso: ${id} declara ${p}, que não existe em packages/core/src`);
  }
}

let failed = false;
const isolation = checkCoreIsolation();
if (isolation.length) {
  failed = true;
  console.log("✗ isolamento dos módulos no core");
  for (const p of isolation) console.log("  - " + p);
} else {
  console.log("✓ isolamento dos módulos no core");
}

const scenarios = [...MODULES.map((m) => [m]), [...MODULES]];
for (const off of scenarios) {
  const started = Date.now();
  const { label, problems } = checkScenario(off);
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
