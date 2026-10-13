// Utilitários do manifest de módulos (modules.json), usados por sync e check.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const REGISTRY_FILE = "components/sections/registry.tsx";

function readManifest(root) {
  return JSON.parse(readFileSync(path.join(root, "modules.json"), "utf8"));
}

export function loadManifest(root) {
  return readManifest(root).modules;
}

// O primeiro path é a rota principal do módulo: ele decide se o módulo está ativo.
// Os demais podem faltar (ex.: pasta de fotos vazia removida) sem desligar o módulo.
export function isActive(root, mod) {
  return existsSync(path.join(root, mod.paths[0]));
}

export function renderRegistry(coreSections, activeModules) {
  const entries = [coreSections, ...activeModules.map((mod) => mod.sections)].flatMap((sections) =>
    Object.entries(sections).map(([type, { from, export: name }]) => ({ type, from, name })),
  );
  const imports = entries.map((e) => `import { ${e.name} } from "${e.from}";`).join("\n");
  const fields = entries.map((e) => `  ${JSON.stringify(e.type)}: ${e.name},`).join("\n");

  return `// Gerado por scripts/sync-modules.mjs a partir de modules.json. Não edite à mão:
// rode "npm run modules:sync" depois de adicionar ou remover um módulo.
import type { SectionRegistry } from "@/types/section-registry";
${imports ? imports + "\n" : ""}
export const sectionRegistry: SectionRegistry = {
${fields ? fields + "\n" : ""}};
`;
}

/** Escreve o registro de seções da home; com check=true só compara. Retorna true se estava em dia. */
export function syncRegistry(root, { check = false } = {}) {
  const manifest = readManifest(root);
  const modules = manifest.modules;
  const partial = modules.filter((m) => !isActive(root, m) && m.paths.slice(1).some((p) => existsSync(path.join(root, p))));
  if (partial.length) {
    throw new Error(`Módulos removidos pela metade (alguns paths ainda existem): ${partial.map((m) => m.id).join(", ")}`);
  }
  const content = renderRegistry(manifest.coreSections, modules.filter((m) => isActive(root, m)));
  const file = path.join(root, REGISTRY_FILE);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current === content) return true;
  if (!check) writeFileSync(file, content);
  return false;
}
