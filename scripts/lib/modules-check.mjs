// Funções do npm run modules:check (scripts/check-modules.mjs), separadas para teste.
// A CLI vai editar o site.config.ts com magicast; aqui a cópia descartável é editada por texto, com
// RegExp escapada. O rm só apaga apps/.modules-check-<cenário>, e nunca através de link simbólico.
import { existsSync, lstatSync, rmSync } from "node:fs";
import path from "node:path";

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const MODULES_LINE = /^(\s*)modules: \[[^\]\n]*\],?[ \t]*$/gm;

/** Troca a linha `modules: [...]` (literal, uma só) pela lista pedida. */
export function setModules(configText, ids) {
  const matches = configText.match(MODULES_LINE) ?? [];
  if (matches.length !== 1) {
    throw new Error(`modules:check: o site.config.ts precisa ter exatamente uma linha "modules: [...]" literal (achei ${matches.length})`);
  }
  return configText.replace(MODULES_LINE, (_line, indent) => `${indent}modules: [${ids.map((id) => JSON.stringify(id)).join(", ")}],`);
}

/** Tira do menu os itens com esses caminhos exatos. */
export function removeMenuRoutes(configText, routes) {
  return routes.reduce(
    (text, route) => text.replace(new RegExp(`^.*path: "${escapeRegExp(route)}".*\\n`, "gm"), ""),
    configText,
  );
}

const SCENARIO = /^[a-z]+(?:-[a-z]+)*$/;

/** Pasta da cópia de um cenário: <raiz>/apps/.modules-check-<ids>. */
export function copyDirFor(root, ids) {
  const name = ids.join("-");
  if (!ids.length || !SCENARIO.test(name)) throw new Error(`modules:check: nome de cenário inválido: ${JSON.stringify(ids)}`);
  return path.join(root, "apps", `.modules-check-${name}`);
}

/** Apaga a cópia, só se for apps/.modules-check-* de verdade (sem link simbólico). */
export function removeCopy(root, dir) {
  const abs = path.resolve(dir);
  const apps = path.join(path.resolve(root), "apps");
  if (path.dirname(abs) !== apps || !path.basename(abs).startsWith(".modules-check-") || abs !== dir.replace(/\/+$/, "")) {
    throw new Error(`modules:check: recuso apagar ${dir}: só apaga apps/.modules-check-*`);
  }
  let stat = null;
  try {
    stat = lstatSync(abs);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`modules:check: ${dir} é um link simbólico; apague à mão depois de conferir`);
  rmSync(abs, { recursive: true, force: true });
}

const offPages = (routePages, offIds) => routePages.filter((p) => offIds.includes(p.module));

/** Rotas geradas (app/(iris)/<rota>/page.tsx) de módulos desligados que ainda existem na cópia. */
export function generatedRouteProblems(dir, routePages, offIds) {
  return offPages(routePages, offIds)
    .map((p) => [p, `app/(iris)/${p.route ? `${p.route}/` : ""}page.tsx`])
    .filter(([, rel]) => existsSync(path.join(dir, rel)))
    .map(([p, rel]) => `${rel} ainda existe com o módulo ${p.module} desligado`);
}

/** Páginas que o next build gerou para rotas de módulos desligados (.next/server/app/<rota>.html ou a pasta). */
export function builtRouteProblems(dir, routePages, offIds) {
  const seen = new Set();
  const problems = [];
  for (const p of offPages(routePages, offIds)) {
    const top = p.route.split("/")[0];
    for (const rel of [`.next/server/app/${top}.html`, `.next/server/app/${top}`]) {
      if (seen.has(rel) || !existsSync(path.join(dir, rel))) continue;
      seen.add(rel);
      problems.push(`${rel} foi gerado com o módulo ${p.module} desligado`);
    }
  }
  return problems;
}
