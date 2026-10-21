// Fixture do alias @cbjk_iris/site-config para o typecheck isolado do core (SPEC §5.1):
// um SiteConfigInput mínimo e válido.
import type { SiteConfigInput } from "@cbjk_iris/schema";

export const siteConfig = {
  name: "Fixture",
  locale: "pt-BR",
  currency: "BRL",
  brand: { colors: {} },
  seo: { title: "Fixture", titleTemplate: "%s | Fixture" },
  whatsapp: { phone: "5511999999999", messages: { general: "Oi", product: "Oi {name}", service: "Oi {name}" } },
  images: { remoteHosts: [] },
  theme: { name: "neutral", colorMode: "system" },
  menu: [{ title: "Início", path: "/" }],
} satisfies SiteConfigInput;
