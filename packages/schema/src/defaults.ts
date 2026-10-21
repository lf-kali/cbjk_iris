// @cbjk_iris/schema/defaults: padrões do config, SEM zod (nem indireto; teste defaults-isolation).
// É o que o core usa no lib/config.ts, que vai para o navegador. A validação com zod
// (resolveSiteConfig) roda no Node, pelo withIris e pelo engine.
import type { SiteConfig, SiteConfigInput } from "./site-config";
import { DEFAULT_MODULES } from "./modules";
import { completeButtonOrder } from "./constants";
import { resolveTexts } from "./texts-defaults";

// Lista explícita (SPEC §5.6, subpath ./defaults); test/exports.test.ts congela a lista.
export { DEFAULT_TEXTS, resolveTexts } from "./texts-defaults";
export { DEFAULT_BUTTON_ORDER } from "./constants";
export { DEFAULT_MODULES } from "./modules";
export type { DeepPartial, PurchaseButtonTexts, SiteTexts } from "./texts";
export type { SiteConfig, SiteConfigInput } from "./site-config";
export type { ModuleId } from "./modules";
export type { PurchasePlatform } from "./constants";

/**
 * Preenche os padrões de um config JÁ VALIDADO, sem validar. Dá o mesmo resultado de
 * siteConfigSchema.parse para um config válido (teste de equivalência em site-config.test.ts).
 * Não muta a entrada.
 */
export function applySiteConfigDefaults(input: SiteConfigInput): SiteConfig {
  return {
    ...input,
    modules: [...(input.modules ?? DEFAULT_MODULES)],
    commerce: { ...input.commerce, buttonOrder: completeButtonOrder(input.commerce?.buttonOrder) },
    home: input.home ?? { sections: [] },
    texts: resolveTexts(input.texts),
  } as SiteConfig;
}
