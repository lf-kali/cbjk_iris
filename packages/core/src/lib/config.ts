// Único arquivo do core que lê o site.config.ts do projeto (alias @cbjk_iris/site-config, SPEC §5.3).
// Todo o resto do core importa siteConfig daqui.
// E2: repassa o config como está. Na E4 passa a ser resolveSiteConfig(raw), com os padrões preenchidos.
import type { SiteConfig } from "@cbjk_iris/schema";
import { siteConfig as raw } from "@cbjk_iris/site-config";

export const siteConfig: SiteConfig = raw;
