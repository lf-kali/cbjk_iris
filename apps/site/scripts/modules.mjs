// Utilitários do manifest de módulos (modules.json), usados por sync-modules e pelo modules:check da raiz.
// Formato de transição da E2: na E6 isto vira SyncRegistry() do @cbjk_iris/engine (SPEC §5.6).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const REGISTRY_FILE = "app/iris.registry.generated.tsx";

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

// "text-image" -> "TextImageSection"
function componentName(type) {
  return type.replace(/(^|-)([a-z])/g, (_m, _sep, c) => c.toUpperCase()) + "Section";
}

export function renderRegistry(coreSections, activeModules) {
  const types = [...coreSections, ...activeModules.flatMap((mod) => mod.sections)];
  const imports = types.map((t) => `import ${componentName(t)} from "@cbjk_iris/core/sections/${t}";`).join("\n");
  const fields = types.map((t) => `  ${JSON.stringify(t)}: ${componentName(t)},`).join("\n");

  return `// Gerado por iris sync. Não edite à mão.
// Até a CLI existir, quem gera é "npm run modules:sync" (apps/site/scripts/sync-modules.mjs), a partir de modules.json.
import type { SectionRegistry } from "@cbjk_iris/schema";
${imports ? imports + "\n" : ""}
export const sectionRegistry: SectionRegistry = {
${fields ? fields + "\n" : ""}};
`;
}

/** Escreve o registro de seções; com check=true só compara. Retorna true se estava em dia. */
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
