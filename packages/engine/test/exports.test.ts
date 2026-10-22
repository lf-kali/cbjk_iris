import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Lista fechada do que o @cbjk_iris/engine publica, por subpath (SPEC §5.6, "Exports do @cbjk_iris/engine").
// Mudou um nome aqui? É mudança de contrato: atualize a spec no mesmo PR (e, depois da tag, ADR).
// Os nomes vêm do verificador de tipos do TypeScript (segue "export *"), separados em valor e tipo,
// e os valores são conferidos também no módulo carregado.

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

const THEME_VALUES = ["availableThemes", "contrastReport", "firstFontFamily", "readThemeFile", "renderThemeCss", "resolveSiteTheme"];
const THEME_TYPES = ["SiteTheme", "ThemeFile", "ThemeVars"];

const EXPECTED: Record<string, { file: string; values: string[]; types: string[] }> = {
  ".": {
    file: "index.ts",
    values: [
      ...THEME_VALUES, "BUILTIN_THEMES_DIR", "ContentError", "IRIS_ALIASES", "ROUTE_PAGES", "SiteConfigLoadError",
      "checkContent", "configDiagnostics", "formatDiagnostic", "importTheme", "listStyles", "listThemes",
      "loadSiteConfig", "removeModuleContent", "sync", "validateTheme", "writeThemeFile",
      "syncBrand", "syncRegistry", "syncRoutes", "withIris",
    ],
    types: [...THEME_TYPES, "RoutePage", "WithIrisSiteConfig"],
  },
  "./next": { file: "next.ts", values: ["IRIS_ALIASES", "withIris"], types: ["WithIrisSiteConfig"] },
  "./theme": { file: "theme/index.ts", values: THEME_VALUES, types: THEME_TYPES },
  "./codegen": {
    file: "codegen/index.ts",
    values: ["GENERATED_HEADER", "ROUTE_PAGES", "sync", "syncBrand", "syncRegistry", "syncRoutes"],
    types: ["RoutePage"],
  },
  "./content": {
    file: "content/index.ts",
    values: ["ContentError", "MAX_CONTENT_FILE_BYTES", "formatDiagnostic", "loadHome", "loadPage", "loadPages", "loadProducts", "loadServices"],
    types: ["ContentOptions", "LoadedPage", "SectionContentOptions"],
  },
};

const files = Object.values(EXPECTED).map((e) => path.join(SRC, e.file));
const program = ts.createProgram(files, {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();

function exportedNames(file: string) {
  const sf = program.getSourceFile(file)!;
  const values: string[] = [];
  const types: string[] = [];
  for (const symbol of checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!)) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    (target.flags & ts.SymbolFlags.Value ? values : types).push(symbol.name);
  }
  return { values: values.sort(), types: types.sort() };
}

const sorted = (list: string[]) => [...list].sort();

describe("exports públicos do @cbjk_iris/engine (lista congelada)", () => {
  it.each(Object.entries(EXPECTED))("%s: valores e tipos iguais aos da spec", async (_subpath, expected) => {
    const { values, types } = exportedNames(path.join(SRC, expected.file));
    expect(values).toEqual(sorted(expected.values));
    expect(types).toEqual(sorted(expected.types));
    const mod = await import(path.join(SRC, expected.file));
    expect(Object.keys(mod).sort()).toEqual(sorted(expected.values));
  });

  it("os subpaths do package.json (exports) são os desta lista: subpath novo exige atualizar o teste", () => {
    const pkg = JSON.parse(readFileSync(path.join(SRC, "../package.json"), "utf8")) as { exports: Record<string, unknown> };
    const subpaths = Object.keys(pkg.exports).filter((k) => k !== "./themes/*" && k !== "./package.json");
    expect(subpaths.sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("./content e ./theme (as entradas que o core importa) não exportam nada que use child_process", () => {
    for (const name of ["checkContent", "removeModuleContent", "loadSiteConfig", "sync", "SiteConfigLoadError"]) {
      expect(EXPECTED["./content"].values).not.toContain(name);
      expect(EXPECTED["./theme"].values).not.toContain(name);
    }
  });
});
