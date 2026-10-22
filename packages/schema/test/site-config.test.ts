import { describe, expect, it } from "vitest";
import { SiteConfigError, resolveSiteConfig, siteConfigSchema, type SiteConfigInput } from "../src";
import { DEFAULT_BUTTON_ORDER, DEFAULT_MODULES, DEFAULT_TEXTS, applySiteConfigDefaults } from "../src/defaults";
import { siteConfig as appSiteConfig } from "../../../apps/site/site.config";

const minimal = {
  name: "Loja",
  locale: "pt-BR",
  currency: "BRL",
  brand: { colors: {} },
  seo: { title: "Loja", titleTemplate: "%s | Loja" },
  whatsapp: { phone: "5511999999999", messages: { general: "Oi", product: "Oi {name}", service: "Oi {name}" } },
  images: { remoteHosts: [] },
  theme: { name: "neutral", colorMode: "system" },
  menu: [{ title: "Início", path: "/" }],
} satisfies SiteConfigInput;

const withConfig = (patch: Record<string, unknown>) => ({ ...minimal, ...patch });
const valid = (v: unknown) => siteConfigSchema.safeParse(v).success;

describe("siteConfigSchema", () => {
  it("o site.config.ts do apps/site valida", () => {
    const r = siteConfigSchema.safeParse(appSiteConfig);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("preenche os padrões: modules, commerce.buttonOrder e texts", () => {
    const c = siteConfigSchema.parse(minimal);
    expect(c.modules).toEqual(["products", "services", "gallery"]);
    expect(c.commerce.buttonOrder).toEqual(DEFAULT_BUTTON_ORDER);
    expect(c.texts.products.buy).toBe(DEFAULT_TEXTS.products.buy);
    expect(c.theme.style).toBeUndefined();
  });

  it("é strict no topo e dentro dos objetos", () => {
    expect(valid(withConfig({ nome: "x" }))).toBe(false);
    expect(valid(withConfig({ seo: { ...minimal.seo, titulo: "x" } }))).toBe(false);
  });

  it("commerce.buttonOrder: repetida falha (com o índice no caminho); as que faltam vão para o fim", () => {
    const r = siteConfigSchema.safeParse(withConfig({ commerce: { buttonOrder: ["shopee", "shopee"] } }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["commerce", "buttonOrder", 1]);
    const c = siteConfigSchema.parse(withConfig({ commerce: { buttonOrder: ["shopee"] } }));
    expect(c.commerce.buttonOrder).toEqual(["shopee", "whatsapp", "mercadoLivre", "amazon", "external"]);
    expect(valid(withConfig({ commerce: { buttonOrder: ["tiktok"] } }))).toBe(false);
  });

  it("modules: só ids conhecidos, sem repetição", () => {
    expect(siteConfigSchema.parse(withConfig({ modules: [] })).modules).toEqual([]);
    expect(valid(withConfig({ modules: ["products", "products"] }))).toBe(false);
    expect(valid(withConfig({ modules: ["blog"] }))).toBe(false);
  });

  it("theme: style em STYLE_IDS; nome do tema em formato de slug", () => {
    expect(valid(withConfig({ theme: { name: "neutral", colorMode: "dark", style: "glass" } }))).toBe(true);
    expect(valid(withConfig({ theme: { name: "neutral", colorMode: "dark", style: "neon" } }))).toBe(false);
    expect(valid(withConfig({ theme: { name: "../../etc/passwd", colorMode: "dark" } }))).toBe(false);
  });

  it("images.remoteHosts: só host exato, sem curinga, caminho, porta ou IP", () => {
    expect(valid(withConfig({ images: { remoteHosts: ["ik.imagekit.io", "images.unsplash.com"] } }))).toBe(true);
    for (const host of ["*", "**", "*.com", "**.imagekit.io", "*.imagekit.io", "a.com/x", "a.com:443", "https://a.com", "localhost", "127.0.0.1", "[::1]", "IK.imagekit.io", "a..com", "-a.com", ""]) {
      expect(valid(withConfig({ images: { remoteHosts: [host] } })), host).toBe(false);
    }
  });

  it("brand.shape: só tokens conhecidos, sem o --; valores CSS sem caracteres de escape do <style>", () => {
    expect(valid(withConfig({ brand: { colors: {}, shape: { radius: "0.5rem", "radius-control": "9999px" } } }))).toBe(true);
    expect(valid(withConfig({ brand: { colors: {}, shape: { "--radius": "1px" } } }))).toBe(false);
    expect(valid(withConfig({ brand: { colors: {}, shape: { borda: "1px" } } }))).toBe(false);
    for (const v of ["1px;color:red", "1px}", "</style><script>", "a\\b", "1px\n"]) {
      expect(valid(withConfig({ brand: { colors: {}, shape: { radius: v } } })), v).toBe(false);
      expect(valid(withConfig({ brand: { colors: { primary: v } } })), v).toBe(false);
      expect(valid(withConfig({ brand: { colors: {}, radius: v } })), v).toBe(false);
      expect(valid(withConfig({ brand: { colors: {}, overrides: { dark: { primary: v } } } })), v).toBe(false);
    }
    expect(valid(withConfig({ brand: { colors: { primary: "oklch(55% 0.2 260)" }, overrides: { light: { "card-foreground": "#111" } } } }))).toBe(true);
    expect(valid(withConfig({ brand: { colors: {}, overrides: { light: { naoExiste: "#111" } } } }))).toBe(false);
  });

  it("brand.fonts: nome do Google simples; fonte local com caminho relativo, sem .. e com extensão de fonte", () => {
    const font = (sans: unknown) => withConfig({ brand: { colors: {}, fonts: { sans } } });
    expect(valid(font({ google: "Playfair Display", weights: ["400", "700"] }))).toBe(true);
    expect(valid(font({ google: 'Inter"; import x' }))).toBe(false);
    expect(valid(font({ google: "Inter", weights: ["400\""] }))).toBe(false);
    expect(valid(font({ local: [{ path: "fonts/marca.woff2", weight: "400" }] }))).toBe(true);
    expect(valid(font({ local: [{ path: "fonts/marca.woff2", weight: "100 900", style: "italic" }] }))).toBe(true);
    for (const path of ["../fora.woff2", "/etc/x.woff2", "fonts/../../x.woff2", "fonts/x.js", "C:\\x.woff2", 'a".woff2']) {
      expect(valid(font({ local: [{ path, weight: "400" }] })), path).toBe(false);
    }
  });

  it("whatsapp.phone só dígitos; currency ISO 4217; titleTemplate com %s", () => {
    expect(valid(withConfig({ whatsapp: { ...minimal.whatsapp, phone: "+55 11 9999" } }))).toBe(false);
    expect(valid(withConfig({ currency: "real" }))).toBe(false);
    expect(valid(withConfig({ seo: { title: "a", titleTemplate: "sem marcador" } }))).toBe(false);
  });

  it("contact.email é validado como e-mail", () => {
    expect(valid(withConfig({ contact: { email: appSiteConfig.contact.email } }))).toBe(true);
    expect(valid(withConfig({ contact: { email: "nao-e-email" } }))).toBe(false);
    expect(valid(withConfig({ contact: { email: "a@b.com\nbcc:c@d.com" } }))).toBe(false);
  });

  it("contact, social, leads: URLs só https", () => {
    expect(valid(withConfig({ contact: { mapEmbedUrl: "http://maps.google.com" } }))).toBe(false);
    expect(valid(withConfig({ contact: { social: { instagram: "javascript:alert(1)" } } }))).toBe(false);
    expect(valid(withConfig({ contact: { social: { orkut: "https://orkut.com" } } }))).toBe(false);
    expect(valid(withConfig({ leads: { provider: "endpoint", endpoint: "http://formspree.io/f/x" } }))).toBe(false);
    expect(valid(withConfig({ leads: { provider: "endpoint", endpoint: "https://formspree.io/f/x", extraFields: { k: "v" } } }))).toBe(true);
    expect(valid(withConfig({ leads: { provider: "whatsapp", intro: "Oi" } }))).toBe(true);
  });

  it("contact.mapEmbedUrl: só mapa incorporado do Google (www.google.com, /maps/embed ou /maps com output=embed)", () => {
    const map = (mapEmbedUrl: string) => siteConfigSchema.safeParse(withConfig({ contact: { mapEmbedUrl } }));
    expect(map(appSiteConfig.contact.mapEmbedUrl).success).toBe(true);
    expect(map("https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657").success).toBe(true);
    for (const url of [
      "https://evil.com/maps/embed",
      "https://www.google.com.evil.com/maps/embed",
      "https://maps.google.com/maps?q=x&output=embed",
      "https://www.google.com/search?q=x",
      "https://www.google.com/maps?q=x",
      "https://www.google.com/maps/embed/../../search",
      "https://localhost/maps/embed",
      "http://www.google.com/maps/embed?pb=x",
      "https://u:p@www.google.com/maps/embed?pb=x",
    ]) {
      const r = map(url);
      expect(r.success, url).toBe(false);
      expect(r.error?.issues[0].message, url).toMatch(/mapa do Google/);
    }
  });

  it("menu: caminhos validados, com submenus", () => {
    expect(valid(withConfig({ menu: [{ title: "A", children: [{ title: "B", path: "/b" }] }] }))).toBe(true);
    expect(valid(withConfig({ menu: [{ title: "A", children: [{ title: "B", path: "javascript:x" }] }] }))).toBe(false);
  });

  it("home e pages saíram do config na E5 (agora em content/): são chave desconhecida", () => {
    expect(valid(withConfig({ home: { sections: [] } }))).toBe(false);
    expect(valid(withConfig({ pages: [{ slug: "sobre", title: "T", sections: [] }] }))).toBe(false);
    expect(siteConfigSchema.parse(minimal)).not.toHaveProperty("home");
    expect(applySiteConfigDefaults(minimal)).not.toHaveProperty("home");
  });
});

describe("resolveSiteConfig", () => {
  it("devolve o config resolvido e não muta a entrada", () => {
    const input = structuredClone(withConfig({ texts: { headerCta: "Oi" } }));
    const before = JSON.stringify(input);
    const c = resolveSiteConfig(input as SiteConfigInput);
    expect(c.texts.headerCta).toBe("Oi");
    expect(JSON.stringify(input)).toBe(before);
  });

  it("config inválido lança SiteConfigError com caminho e mensagem em pt-BR", () => {
    const bad = withConfig({ images: { remoteHosts: ["**"] }, whatsapp: { phone: "1", messages: minimal.whatsapp.messages } });
    let error: unknown;
    try {
      resolveSiteConfig(bad as SiteConfigInput);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SiteConfigError);
    const err = error as SiteConfigError;
    expect(err.message).toMatch(/^site\.config\.ts tem erros:/);
    expect(err.message).toMatch(/images\.remoteHosts\[0\]: /);
    expect(err.message).toMatch(/whatsapp\.phone: /);
    expect(err.issues.length).toBe(2);
  });

  it("mensagens sem texto próprio saem em pt-BR (locale do zod por parse)", () => {
    expect(() => resolveSiteConfig({ ...minimal, name: 1 } as never)).toThrow(/name: .*(esperava|Entrada inválida)/);
  });
});

describe("applySiteConfigDefaults (sem zod) é equivalente a siteConfigSchema.parse", () => {
  const cases: Record<string, unknown> = {
    "apps/site": appSiteConfig,
    mínimo: minimal,
    "texts parcial": withConfig({ texts: { products: { buttons: { shopee: "Shopee!" } }, footer: { menu: "Menu" } } }),
    buyOnWhatsapp: withConfig({ texts: { products: { buyOnWhatsapp: "Zap" } } }),
    "buyOnWhatsapp e buttons.whatsapp": withConfig({ texts: { products: { buyOnWhatsapp: "Zap", buttons: { whatsapp: "WhatsApp!" } } } }),
    "buttonOrder parcial": withConfig({ commerce: { buttonOrder: ["amazon", "shopee"] } }),
    "commerce vazio": withConfig({ commerce: {} }),
    "buttonOrder completo": withConfig({ commerce: { buttonOrder: ["external", "amazon", "shopee", "mercadoLivre", "whatsapp"] } }),
    "modules ausente": minimal,
    "modules vazio": withConfig({ modules: [] }),
    "modules parcial": withConfig({ modules: ["gallery"] }),
    "tudo junto": withConfig({
      modules: ["products"],
      commerce: { buttonOrder: ["shopee"] },
      texts: { products: { buyOnWhatsapp: "Zap" }, headerCta: "Oi" },
      theme: { name: "caffeine", colorMode: "light", style: "soft" },
      brand: { colors: { primary: "#123456" }, shape: { radius: "1rem" } },
    }),
  };

  for (const [name, input] of Object.entries(cases)) {
    it(name, () => {
      expect(applySiteConfigDefaults(input as SiteConfigInput)).toEqual(siteConfigSchema.parse(input));
    });
  }

  it("não muta a entrada e devolve objetos novos", () => {
    const input = withConfig({ commerce: { buttonOrder: ["shopee"] } }) as SiteConfigInput;
    const before = JSON.stringify(input);
    const out = applySiteConfigDefaults(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(out.commerce).not.toBe(input.commerce);
    expect(DEFAULT_MODULES).toEqual(["products", "services", "gallery"]);
    expect(out.modules).not.toBe(DEFAULT_MODULES);
  });
});
