// Leitura do projeto (SPEC §5.6, LoadSiteConfig). Exportado só pela raiz do engine: usa child_process.
export { CONFIG_FILE, configDiagnostics, SiteConfigLoadError } from "./errors";
export { loadSiteConfig, loadSiteConfigSync, readRawSiteConfig } from "./load-config";
