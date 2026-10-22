import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SECTION_TYPES } from "@cbjk_iris/schema";

// Toda seção tem componente, e vice-versa (SPEC §5.5 e §6.1): para cada tipo de sectionDefinitions existe
// packages/core/src/sections/<type>.tsx (o que o registro gerado importa), e todo arquivo <type>.tsx
// dessa pasta é de um tipo que existe. Cada um só reexporta o componente como default, e o alvo existe.

const SECTIONS = path.resolve(__dirname, "../src/sections");
const REEXPORT = /^export \{ (\w+) as default \} from "(\.{1,2}\/[\w/.-]+)";$/m;

// arquivos de reexport: nome em kebab-case minúsculo (os componentes são PascalCase)
export function reexportTypes(names: string[]): string[] {
  return names.filter((n) => /^[a-z]+(?:-[a-z]+)*\.tsx$/.test(n)).map((n) => n.slice(0, -".tsx".length)).sort();
}

describe("seções × componentes do core", () => {
  it("toda seção tem componente, e vice-versa", () => {
    expect(reexportTypes(readdirSync(SECTIONS))).toEqual([...SECTION_TYPES].sort());
  });

  it.each([...SECTION_TYPES])("sections/%s.tsx reexporta um componente que existe", (type) => {
    const match = REEXPORT.exec(readFileSync(path.join(SECTIONS, `${type}.tsx`), "utf8"));
    expect(match, `${type}.tsx precisa de: export { XxxSection as default } from "./XxxSection";`).not.toBeNull();
    const target = path.resolve(SECTIONS, match![2]);
    expect(existsSync(`${target}.tsx`) || existsSync(`${target}.ts`), target).toBe(true);
  });

  it("controle negativo: arquivo de seção a mais ou a menos é apontado", () => {
    const names = [...SECTION_TYPES.map((t) => `${t}.tsx`), "HeroSection.tsx", "icons.ts"];
    expect(reexportTypes(names)).toEqual([...SECTION_TYPES].sort());
    expect(reexportTypes([...names, "nova-secao.tsx"])).not.toEqual([...SECTION_TYPES].sort());
    expect(reexportTypes(names.filter((n) => n !== "faq.tsx"))).not.toEqual([...SECTION_TYPES].sort());
  });
});
