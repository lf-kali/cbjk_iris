import { describe, expect, it } from "vitest";
import {
  SECTION_TYPES,
  getSectionDefinition,
  homeSchema,
  pageSchema,
  sectionDefinitions,
  sectionSchema,
  sectionsOfModule,
} from "../src";
import { siteConfig } from "../../../apps/site/site.config";

const CORE = ["hero", "benefits", "text-image", "cta-banner", "testimonials", "stats", "faq", "contact", "lead-form", "widget"];

describe("definições de seção", () => {
  it("são 13, na ordem de hoje, com o módulo certo", () => {
    expect(SECTION_TYPES).toEqual([...CORE, "products", "services", "gallery"]);
    expect(sectionsOfModule("core")).toEqual(CORE);
    expect(sectionsOfModule("products")).toEqual(["products"]);
    expect(sectionsOfModule("services")).toEqual(["services"]);
    expect(sectionsOfModule("gallery")).toEqual(["gallery"]);
  });

  it("cada definição tem label e description em pt-BR, e os presets validam", () => {
    for (const def of sectionDefinitions) {
      expect(def.label.length, def.type).toBeGreaterThan(0);
      expect(def.description.length, def.type).toBeGreaterThan(0);
      for (const preset of def.presets) {
        expect(def.schema.safeParse({ ...preset.value, type: def.type }).success, `${def.type}/${preset.id}`).toBe(true);
      }
    }
  });

  it("as seções com lista obrigatória têm preset", () => {
    for (const type of ["hero", "benefits", "stats", "testimonials", "faq"]) {
      expect(getSectionDefinition(type as "hero").presets.length, type).toBeGreaterThan(0);
    }
  });

  it("getSectionDefinition falha para tipo desconhecido", () => {
    expect(() => getSectionDefinition("nao-existe" as never)).toThrow(/nao-existe/);
  });

  it("as seções de hoje (home e páginas do apps/site) validam", () => {
    const sections: { type: string }[] = [...siteConfig.home.sections, ...siteConfig.pages.flatMap((p): { type: string }[] => [...p.sections])];
    for (const s of sections) {
      const r = sectionSchema.safeParse(s);
      expect(r.success, `${s.type}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("hero não aceita title (sectionBase menos o hero)", () => {
    const r = sectionSchema.safeParse({ type: "hero", title: "x", slides: [{ image: "/a.jpg", alt: "a", title: "t" }] });
    expect(r.success).toBe(false);
  });

  it("chave desconhecida dentro de um item de lista falha (strict em todos os níveis)", () => {
    const r = sectionSchema.safeParse({ type: "faq", items: [{ question: "a", answer: "b", questoin: "c" }] });
    expect(r.success).toBe(false);
  });

  it("rating fora de 1..5 falha; ícone fora da lista falha", () => {
    expect(sectionSchema.safeParse({ type: "testimonials", items: [{ name: "a", text: "b", rating: 6 }] }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "benefits", items: [{ icon: "foguete", title: "a", text: "b" }] }).success).toBe(false);
  });

  it("lead-form não aceita campo repetido", () => {
    expect(sectionSchema.safeParse({ type: "lead-form", fields: ["name", "name"] }).success).toBe(false);
  });

  it("widget: minHeight só aceita comprimento CSS simples", () => {
    expect(sectionSchema.safeParse({ type: "widget", html: "<div></div>", minHeight: "320px" }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "widget", html: "<div></div>", minHeight: "320px;color:red" }).success).toBe(false);
  });

  it("links: href só /, #, https:, mailto: e tel:", () => {
    const cta = (href: string) => ({ type: "cta-banner", cta: { label: "Ir", href } });
    for (const href of ["/sobre", "#contato", "https://exemplo.com", "mailto:a@b.com", "tel:+5511999999999"]) {
      expect(sectionSchema.safeParse(cta(href)).success, href).toBe(true);
    }
    for (const href of ["javascript:alert(1)", "//evil.com", "http://exemplo.com", "data:text/html,x", "sobre", "https://u:p@exemplo.com"]) {
      expect(sectionSchema.safeParse(cta(href)).success, href).toBe(false);
    }
    expect(sectionSchema.safeParse({ type: "cta-banner", cta: { label: "Zap", whatsapp: true } }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "cta-banner", cta: { label: "Zap", whatsapp: false } }).success).toBe(false);
  });

  it("imagens: caminho em public/ ou https, sem .. e sem //", () => {
    const text = (image: string) => ({ type: "text-image", text: "t", image, imageAlt: "a" });
    expect(sectionSchema.safeParse(text("/home/a.jpg")).success).toBe(true);
    expect(sectionSchema.safeParse(text("https://ik.imagekit.io/a.jpg")).success).toBe(true);
    for (const image of ["/../etc/passwd", "//evil.com/a.jpg", "a.jpg", "http://x.com/a.jpg", "/a\\..\\b.jpg"]) {
      expect(sectionSchema.safeParse(text(image)).success, image).toBe(false);
    }
  });
});

describe("homeSchema e pageSchema", () => {
  it("limits.maxPerPage: duas FAQs ou dois heros na mesma página falham", () => {
    const faq = { type: "faq", items: [{ question: "a", answer: "b" }] };
    const r = pageSchema.safeParse({ title: "Sobre", sections: [faq, faq] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/faq/);
    const hero = { type: "hero", slides: [{ image: "/a.jpg", alt: "a", title: "t" }] };
    expect(homeSchema.safeParse({ sections: [hero, hero] }).success).toBe(false);
    expect(homeSchema.safeParse({ sections: [hero, faq] }).success).toBe(true);
  });

  it("página exige title e é strict", () => {
    expect(pageSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(pageSchema.safeParse({ title: "a", sections: [], slug: "x" }).success).toBe(false);
    expect(pageSchema.safeParse({ title: "a", description: "d", sections: [] }).success).toBe(true);
  });
});
