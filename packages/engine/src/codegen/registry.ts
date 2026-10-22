// SyncRegistry (SPEC §5.5 e §5.6): app/iris.registry.generated.tsx a partir de sectionDefinitions e
// siteConfig.modules. Seções do núcleo primeiro, depois as dos módulos ativos na ordem de MODULES
// (não na ordem em que o cliente os escreveu: a saída não muda se ele reordenar a lista).
import { MODULES, sectionDefinitions, type SiteConfig } from "@cbjk_iris/schema";
import { GENERATED_HEADER, type SyncPlan } from "./files";

export const REGISTRY_FILE = "app/iris.registry.generated.tsx";

// "text-image" -> "TextImageSection"
function componentName(type: string): string {
  return type.replace(/(^|-)([a-z])/g, (_m, _sep, c: string) => c.toUpperCase()) + "Section";
}

export function renderRegistry(modules: readonly string[]): string {
  const active = MODULES.filter((m) => modules.includes(m.id)).map((m) => m.id as string);
  const types = [
    ...sectionDefinitions.filter((d) => d.module === "core"),
    ...active.flatMap((id) => sectionDefinitions.filter((d) => d.module === id)),
  ].map((d) => d.type);
  const imports = types.map((t) => `import ${componentName(t)} from "@cbjk_iris/core/sections/${t}";`).join("\n");
  const fields = types.map((t) => `  ${JSON.stringify(t)}: ${componentName(t)},`).join("\n");
  return `${GENERATED_HEADER}
// Fonte: sectionDefinitions do @cbjk_iris/schema e siteConfig.modules. Para regenerar: npm run sync (depois, iris sync).
import type { SectionRegistry } from "@cbjk_iris/schema";
${imports ? imports + "\n" : ""}
export const sectionRegistry: SectionRegistry = {
${fields ? fields + "\n" : ""}};
`;
}

export function planRegistry(config: SiteConfig): SyncPlan {
  return { files: new Map([[REGISTRY_FILE, renderRegistry(config.modules)]]), remove: [], diagnostics: [] };
}
