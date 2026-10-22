// Sync, SyncBrand, SyncRegistry e SyncRoutes (SPEC §5.6). Cada um carrega o config (processo filho,
// sempre atual) e aplica o plano com as regras de files.ts. O Sync carrega uma vez e aplica os três
// juntos: com qualquer erro no plano, nada é escrito (cada arquivo é atômico; o conjunto não).
import path from "node:path";
import type { SiteConfig, Sync, SyncBrand, SyncRegistry, SyncResult, SyncRoutes } from "@cbjk_iris/schema";
import { configDiagnostics } from "../project/errors";
import { loadSiteConfigSync } from "../project/load-config";
import { planBrand } from "../theme/sync-brand";
import { applyPlan, mergePlans, type SyncPlan } from "./files";
import { planRegistry } from "./registry";
import { planRoutes } from "./routes";

function run(root: string, opts: { check: boolean }, planner: (root: string, config: SiteConfig) => SyncPlan): SyncResult {
  const abs = path.resolve(/* turbopackIgnore: true */ root);
  let config: SiteConfig;
  try {
    config = loadSiteConfigSync(abs);
  } catch (error) {
    return { changed: [], upToDate: false, diagnostics: configDiagnostics(error) };
  }
  return applyPlan(abs, planner(abs, config), opts?.check === true);
}

export const syncBrand: SyncBrand = (root, opts) => run(root, opts, planBrand);
export const syncRegistry: SyncRegistry = (root, opts) => run(root, opts, (_root, config) => planRegistry(config));
export const syncRoutes: SyncRoutes = (root, opts) => run(root, opts, (_root, config) => planRoutes(config));
export const sync: Sync = (root, opts) =>
  run(root, opts, (abs, config) => mergePlans([planBrand(abs, config), planRegistry(config), planRoutes(config)]));
