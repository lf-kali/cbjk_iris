import { describe, expect, it } from "vitest";
import { MODULES, MODULE_IDS, sectionsOfModule } from "../src";

// O apps/site/modules.json de transição saiu na E6a: os valores que ele tinha ficam congelados aqui.

describe("MODULES (§5.5)", () => {
  it("ids, nomes, rotas e diretórios de conteúdo da spec", () => {
    expect(MODULE_IDS).toEqual(["products", "services", "gallery"]);
    expect(MODULES.map((m) => m.contentDir)).toEqual(["content/products", "content/services", "public/ultimos_projetos"]);
    expect(MODULES.find((m) => m.id === "gallery")?.routes).toEqual(["ultimos-projetos"]);
  });

  it("nomes, menu e seções de cada módulo (os do antigo modules.json)", () => {
    expect(MODULES.map((m) => [m.id, m.name, [...m.menu], sectionsOfModule(m.id)])).toEqual([
      ["products", "Produtos", ["/produtos"], ["products"]],
      ["services", "Serviços", ["/servicos"], ["services"]],
      ["gallery", "Últimos projetos", ["/ultimos-projetos"], ["gallery"]],
    ]);
    expect(sectionsOfModule("core")).toEqual([
      "hero", "benefits", "text-image", "cta-banner", "testimonials", "stats", "faq", "contact", "lead-form", "widget",
    ]);
  });
});
