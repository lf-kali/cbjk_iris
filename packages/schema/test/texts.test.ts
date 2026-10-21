import { describe, expect, it } from "vitest";
import { DEFAULT_TEXTS, resolveTexts } from "../src/defaults";
import { siteConfigSchema } from "../src";

describe("resolveTexts", () => {
  it("sem entrada, devolve uma cópia de DEFAULT_TEXTS (mais o alias obsoleto)", () => {
    const texts = resolveTexts();
    expect(texts).toEqual({
      ...DEFAULT_TEXTS,
      products: { ...DEFAULT_TEXTS.products, buyOnWhatsapp: DEFAULT_TEXTS.products.buttons.whatsapp },
    });
    expect(texts).not.toBe(DEFAULT_TEXTS);
    expect(texts.products.buttons).not.toBe(DEFAULT_TEXTS.products.buttons);
  });

  it("faz merge profundo: troca só a folha pedida e mantém as irmãs", () => {
    const texts = resolveTexts({ products: { buttons: { shopee: "Ver na Shopee" } }, headerCta: "Fale conosco" });
    expect(texts.products.buttons.shopee).toBe("Ver na Shopee");
    expect(texts.products.buttons.amazon).toBe(DEFAULT_TEXTS.products.buttons.amazon);
    expect(texts.products.title).toBe(DEFAULT_TEXTS.products.title);
    expect(texts.headerCta).toBe("Fale conosco");
    expect(texts.sections.contact.phone).toBe(DEFAULT_TEXTS.sections.contact.phone);
  });

  it("buyOnWhatsapp vale como buttons.whatsapp quando este falta", () => {
    const texts = resolveTexts({ products: { buyOnWhatsapp: "Pedir no Zap" } });
    expect(texts.products.buttons.whatsapp).toBe("Pedir no Zap");
    expect(texts.products.buyOnWhatsapp).toBe("Pedir no Zap");
  });

  it("buttons.whatsapp vence buyOnWhatsapp quando os dois existem", () => {
    const texts = resolveTexts({ products: { buyOnWhatsapp: "Antigo", buttons: { whatsapp: "Novo" } } });
    expect(texts.products.buttons.whatsapp).toBe("Novo");
    expect(texts.products.buyOnWhatsapp).toBe("Novo");
  });

  it("não muta DEFAULT_TEXTS nem a entrada", () => {
    const before = JSON.stringify(DEFAULT_TEXTS);
    const input = { products: { buttons: { amazon: "A" } } };
    const inputBefore = JSON.stringify(input);
    resolveTexts(input).products.buttons.amazon = "mudado";
    expect(JSON.stringify(DEFAULT_TEXTS)).toBe(before);
    expect(JSON.stringify(input)).toBe(inputBefore);
    expect(Object.isFrozen(DEFAULT_TEXTS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_TEXTS.products.buttons)).toBe(true);
  });

  it("DEFAULT_TEXTS tem as chaves novas do §5.2 com os padrões pt-BR", () => {
    expect(DEFAULT_TEXTS.products.buy).toBe("Comprar agora");
    expect(DEFAULT_TEXTS.products.buttons).toEqual({
      whatsapp: "Comprar pelo WhatsApp",
      mercadoLivre: "Comprar no Mercado Livre",
      shopee: "Comprar na Shopee",
      amazon: "Comprar na Amazon",
      external: "Comprar no site",
    });
    expect(DEFAULT_TEXTS.products.cardLabel).toBe("{buy} ({platform})");
    expect(DEFAULT_TEXTS.products.platforms).toEqual({
      whatsapp: "WhatsApp",
      mercadoLivre: "Mercado Livre",
      shopee: "Shopee",
      amazon: "Amazon",
      external: "site",
    });
    expect("buyOnWhatsapp" in DEFAULT_TEXTS.products).toBe(false);
  });
});

describe("texts no siteConfigSchema", () => {
  it("chave de texto desconhecida é erro (pega erro de digitação)", () => {
    const r = siteConfigSchema.shape.texts.safeParse({ products: { tittle: "x" } });
    expect(r.success).toBe(false);
  });

  it("texts parcial é aceito e sai completo", () => {
    const r = siteConfigSchema.shape.texts.parse({ footer: { menu: "Menu" } });
    expect(r.footer.menu).toBe("Menu");
    expect(r.footer.contact).toBe(DEFAULT_TEXTS.footer.contact);
  });
});
