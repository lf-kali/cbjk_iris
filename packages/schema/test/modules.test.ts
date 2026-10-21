import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES, MODULE_IDS, sectionsOfModule } from "../src";

// Até a E6, o apps/site/modules.json de transição ainda decide quais rotas existem.
// As duas listas precisam concordar.
const legacy = JSON.parse(readFileSync(path.resolve(__dirname, "../../../apps/site/modules.json"), "utf8"));

describe("MODULES (§5.5)", () => {
  it("ids, nomes, rotas e diretórios de conteúdo da spec", () => {
    expect(MODULE_IDS).toEqual(["products", "services", "gallery"]);
    expect(MODULES.map((m) => m.contentDir)).toEqual(["content/products", "content/services", "public/ultimos_projetos"]);
    expect(MODULES.find((m) => m.id === "gallery")?.routes).toEqual(["ultimos-projetos"]);
  });

  it("concorda com o modules.json de transição (ids, nomes, menu e seções)", () => {
    expect(legacy.modules.map((m: { id: string }) => m.id)).toEqual([...MODULE_IDS]);
    for (const mod of legacy.modules) {
      const m = MODULES.find((x) => x.id === mod.id)!;
      expect(m.name).toBe(mod.name);
      expect([...m.menu]).toEqual(mod.menu);
      expect(sectionsOfModule(m.id)).toEqual(mod.sections);
    }
    expect(sectionsOfModule("core")).toEqual(legacy.coreSections);
  });
});
