// Fixture do alias @cbjk_iris/site-config para o typecheck isolado do core (SPEC §5.1).
// Só o tipo importa aqui: o core nunca roda contra esta fixture.
// Na E4 vira um SiteConfigInput mínimo e válido, para os testes de render.
import type { SiteConfig } from "@cbjk_iris/schema";

export const siteConfig = {} as SiteConfig;
