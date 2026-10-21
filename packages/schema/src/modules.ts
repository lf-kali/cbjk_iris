// Manifesto dos módulos opcionais (SPEC §5.5). Sem zod: entra no subpath ./defaults.
// As seções de cada módulo vêm de definition.module (sections/), não daqui: assim não há duas listas.

export const MODULES = [
  { id: "products", name: "Produtos", routes: ["produtos", "produto/[slug]"], menu: ["/produtos"], contentDir: "content/products" },
  { id: "services", name: "Serviços", routes: ["servicos", "servico/[slug]"], menu: ["/servicos"], contentDir: "content/services" },
  { id: "gallery", name: "Últimos projetos", routes: ["ultimos-projetos"], menu: ["/ultimos-projetos"], contentDir: "public/ultimos_projetos" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export type ModuleManifest = (typeof MODULES)[number];

export const MODULE_IDS: readonly ModuleId[] = Object.freeze(MODULES.map((m) => m.id));

/** Módulos ativos quando siteConfig.modules está ausente (o comportamento de antes). */
export const DEFAULT_MODULES: readonly ModuleId[] = MODULE_IDS;
