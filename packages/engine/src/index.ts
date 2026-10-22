// @cbjk_iris/engine: lógica de Node do Iris (SPEC §5.1 e §5.6). A raiz é a API da CLI e dos scripts.
// Importe só em código de Node: usa fs e child_process. O core importa só ./content e ./theme
// (server components), nunca a raiz.
export * from "./theme";
export { BUILTIN_THEMES_DIR } from "./paths";
export { IRIS_ALIASES, withIris, type WithIrisSiteConfig } from "./next";
export { configDiagnostics, loadSiteConfig, SiteConfigLoadError } from "./project";
export { ROUTE_PAGES, sync, syncBrand, syncRegistry, syncRoutes, type RoutePage } from "./codegen";
export { ContentError, formatDiagnostic } from "./content/errors";
export { checkContent } from "./content/check";
export { removeModuleContent } from "./modules";
// tema mínimo (E6c): fora do ./theme, que o core importa (importTheme usa a rede)
export { listStyles, listThemes, validateTheme } from "./theme/api";
export { importTheme, writeThemeFile } from "./theme/import";
