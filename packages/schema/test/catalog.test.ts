import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUTTON_ORDER,
  PLATFORM_HOSTS,
  httpsUrl,
  platformUrl,
  productContentSchema,
  productSchema,
  serviceContentSchema,
  serviceSchema,
} from "../src";

const ml = platformUrl("mercadoLivre");
const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: string) => s.safeParse(v).success;

describe("platformUrl (regra de host do §5.2)", () => {
  it("aceita o host exato e subdomínios de cada plataforma", () => {
    expect(ok(ml, "https://mercadolivre.com.br/x")).toBe(true);
    expect(ok(ml, "https://produto.mercadolivre.com.br/MLB-123")).toBe(true);
    expect(ok(ml, "https://lista.mercadolivre.com.br/capinha-iphone-15")).toBe(true);
    expect(ok(ml, "https://PRODUTO.MercadoLivre.com.br/x")).toBe(true);
    expect(ok(platformUrl("shopee"), "https://shopee.com.br/produto")).toBe(true);
    expect(ok(platformUrl("amazon"), "https://www.amazon.com.br/dp/B0")).toBe(true);
    expect(ok(platformUrl("amazon"), "https://amzn.to/abc")).toBe(true);
  });

  it("rejeita host que só começa ou termina parecido", () => {
    expect(ok(ml, "https://mercadolivre.com.br.evil.com/x")).toBe(false);
    expect(ok(ml, "https://evilmercadolivre.com.br/x")).toBe(false);
    expect(ok(ml, "https://mercadolivre.com.br./x")).toBe(false);
    expect(ok(ml, "https://shopee.com.br/x")).toBe(false);
  });

  it("rejeita credenciais, porta, http:, javascript: e data:", () => {
    expect(ok(ml, "https://user:pass@mercadolivre.com.br/x")).toBe(false);
    expect(ok(ml, "https://user@mercadolivre.com.br/x")).toBe(false);
    expect(ok(ml, "https://evil.com@mercadolivre.com.br/x")).toBe(false);
    expect(ok(ml, "https://mercadolivre.com.br:8443/x")).toBe(false);
    expect(ok(ml, "http://mercadolivre.com.br/x")).toBe(false);
    expect(ok(ml, "javascript:alert(1)//mercadolivre.com.br")).toBe(false);
    expect(ok(ml, "data:text/html,mercadolivre.com.br")).toBe(false);
    expect(ok(ml, "https://")).toBe(false);
  });

  it("até 2048 caracteres", () => {
    const base = "https://mercadolivre.com.br/";
    expect(ok(ml, base + "a".repeat(2048 - base.length))).toBe(true);
    expect(ok(ml, base + "a".repeat(2049 - base.length))).toBe(false);
  });

  it("a mensagem diz o campo e dá um exemplo", () => {
    const r = ml.safeParse("https://shopee.com.br/x");
    expect(r.error?.issues[0].message).toBe(
      "mercadoLivreLink precisa ser um link https do Mercado Livre (ex.: https://produto.mercadolivre.com.br/...)",
    );
    expect(platformUrl("shopee").safeParse("x").error?.issues[0].message).toMatch(/^shopeeLink precisa ser um link https da Shopee/);
    expect(platformUrl("amazon").safeParse("x").error?.issues[0].message).toMatch(/^amazonLink precisa ser um link https da Amazon/);
  });

  it("PLATFORM_HOSTS é o do §5.2", () => {
    expect(PLATFORM_HOSTS.mercadoLivre).toEqual(["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com"]);
    expect(PLATFORM_HOSTS.shopee).toEqual(["shopee.com.br", "shopee.com", "shope.ee"]);
    expect(PLATFORM_HOSTS.amazon).toEqual(["amazon.com.br", "amazon.com", "amzn.to", "a.co"]);
  });
});

describe("httpsUrl", () => {
  it("aceita https com qualquer host e rejeita o resto", () => {
    expect(ok(httpsUrl, "https://loja.exemplo.com/p?x=1")).toBe(true);
    for (const v of ["http://a.com", "javascript:alert(1)", "data:x", "https://u:p@a.com", "ftp://a.com", "https:///", "a.com"]) {
      expect(ok(httpsUrl, v), v).toBe(false);
    }
    expect(ok(httpsUrl, "https://a.com/" + "a".repeat(2049))).toBe(false);
  });
});

const withoutKindAndSlug = (item: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(item).filter(([key]) => key !== "kind" && key !== "slug"));

const product = {
  kind: "product",
  slug: "capa-x",
  name: "Capa X",
  shortDescription: "Capa",
  description: "Capa de silicone",
  images: ["/products/capa-1.jpg"],
  category: "Capas",
  price: 49.9,
  stockQty: 3,
};

describe("productSchema", () => {
  it("whatsappButton ausente vale true na saída", () => {
    expect(productSchema.parse(product).whatsappButton).toBe(true);
    expect(productSchema.parse({ ...product, whatsappButton: false }).whatsappButton).toBe(false);
  });

  it("aceita os links de marketplace e o externo; rejeita link de outra plataforma", () => {
    const p = productSchema.parse({
      ...product,
      mercadoLivreLink: "https://lista.mercadolivre.com.br/capa",
      shopeeLink: "https://shopee.com.br/capa",
      amazonLink: "https://www.amazon.com.br/s?k=capa",
      externalLink: "https://loja.exemplo.com/capa",
    });
    expect(p.externalLink).toBe("https://loja.exemplo.com/capa");
    expect(productSchema.safeParse({ ...product, shopeeLink: "https://amazon.com/x" }).success).toBe(false);
    const r = productSchema.safeParse({ ...product, externalLink: "http://loja.com" });
    expect(r.error?.issues[0].message).toBe("externalLink precisa começar com https://");
  });

  it("é strict, valida slug, preço e order", () => {
    expect(productSchema.safeParse({ ...product, cor: "azul" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, slug: "Capa X" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, slug: "a".repeat(81) }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, price: -1 }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, stockQty: 1.5 }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, images: [] }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, order: 10 }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, order: -10 }).success).toBe(false);
  });

  it("productContentSchema: sem kind, sem slug e sem $schema (o loader remove)", () => {
    const content = withoutKindAndSlug(product);
    expect(productContentSchema.safeParse(content).success).toBe(true);
    expect(productContentSchema.safeParse({ ...content, slug: "x" }).success).toBe(false);
    expect(productContentSchema.safeParse({ ...content, kind: "product" }).success).toBe(false);
    expect(productContentSchema.safeParse({ ...content, $schema: "../x.json" }).success).toBe(false);
  });
});

describe("serviceSchema", () => {
  const service = { kind: "service", slug: "troca-de-tela", name: "Troca de tela", shortDescription: "a", description: "b", images: ["/services/a.jpg"] };
  it("valida e não tem campos de compra", () => {
    expect(serviceSchema.safeParse(service).success).toBe(true);
    expect(serviceSchema.safeParse({ ...service, price: 10 }).success).toBe(false);
    const content = withoutKindAndSlug(service);
    expect(serviceContentSchema.safeParse(content).success).toBe(true);
  });
});

it("DEFAULT_BUTTON_ORDER é a ordem nativa", () => {
  expect(DEFAULT_BUTTON_ORDER).toEqual(["whatsapp", "mercadoLivre", "shopee", "amazon", "external"]);
});
