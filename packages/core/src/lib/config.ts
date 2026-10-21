// Único arquivo do core que lê o site.config.ts do projeto (alias @cbjk_iris/site-config, SPEC §5.3).
// Todo o resto do core importa siteConfig daqui.
// Este arquivo vai para o navegador (componentes "use client" importam o config), então usa
// @cbjk_iris/schema/defaults, sem zod: só preenche os padrões. A validação completa
// (resolveSiteConfig) roda no Node, pelo withIris no next.config, e falha o build antes daqui.
import { applySiteConfigDefaults, type SiteConfig } from "@cbjk_iris/schema/defaults";
import { siteConfig as raw } from "@cbjk_iris/site-config";

export const siteConfig: SiteConfig = applySiteConfigDefaults(raw);
