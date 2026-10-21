// Config mínimo e válido para os testes do engine.
import type { SiteConfigInput } from "@cbjk_iris/schema";

export function siteConfigFixture(patch: Partial<SiteConfigInput> = {}): SiteConfigInput {
  return {
    name: "Loja",
    locale: "pt-BR",
    currency: "BRL",
    brand: { colors: {} },
    seo: { title: "Loja", titleTemplate: "%s | Loja" },
    whatsapp: { phone: "5511999999999", messages: { general: "Oi", product: "Oi {name}", service: "Oi {name}" } },
    images: { remoteHosts: [] },
    theme: { name: "neutral", colorMode: "system" },
    menu: [],
    ...patch,
  };
}
