import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BUILTIN_THEMES_DIR } from "../src/paths";
import { availableThemes, firstFontFamily, readThemeFile } from "../src/theme/theme-file";

const PROJECT_THEME = `:root {\n  --background: #fff;\n  --foreground: #000;\n}\n.dark {\n  --background: #000;\n  --foreground: #fff;\n}\n`;

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-theme-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("temas embutidos", () => {
  it("ficam em packages/engine/themes, achados por import.meta.url", () => {
    expect(BUILTIN_THEMES_DIR).toBe(path.resolve(__dirname, "../themes"));
    expect(readdirSync(BUILTIN_THEMES_DIR).filter((f) => f.endsWith(".css"))).toHaveLength(10);
  });

  it("um projeto sem themes/ lê o tema embutido", () => {
    const theme = readThemeFile("taupe", root);
    expect(theme.name).toBe("taupe");
    expect(theme.light.background).toBeTruthy();
    expect(theme.dark.background).toBeTruthy();
  });

  it("availableThemes lista os embutidos quando o projeto não tem themes/", () => {
    expect(availableThemes(root)).toEqual([
      "caffeine", "elegant-luxury", "gray", "modern-minimal", "neutral",
      "ocean-breeze", "slate", "stone", "taupe", "zinc",
    ]);
  });
});

describe("temas do projeto", () => {
  beforeEach(() => {
    mkdirSync(path.join(root, "themes"));
  });

  it("um tema em themes/ do projeto com o mesmo nome tem prioridade", () => {
    writeFileSync(path.join(root, "themes", "taupe.css"), PROJECT_THEME);
    expect(readThemeFile("taupe", root).light.background).toBe("#fff");
  });

  it("availableThemes junta projeto e embutidos, sem repetir, em ordem", () => {
    writeFileSync(path.join(root, "themes", "minha-marca.css"), PROJECT_THEME);
    writeFileSync(path.join(root, "themes", "taupe.css"), PROJECT_THEME);
    writeFileSync(path.join(root, "themes", "notas.txt"), "x");
    const names = availableThemes(root);
    expect(names).toContain("minha-marca");
    expect(names.filter((n) => n === "taupe")).toHaveLength(1);
    expect(names).toEqual([...names].sort());
  });

  it("tema sem :root ou .dark dá erro com o nome do arquivo", () => {
    writeFileSync(path.join(root, "themes", "quebrado.css"), ":root { --background: #fff; }");
    expect(() => readThemeFile("quebrado", root)).toThrow(/themes\/quebrado\.css/);
  });
});

describe("readThemeFile", () => {
  it("tema inexistente lista os disponíveis", () => {
    expect(() => readThemeFile("nao-existe", root)).toThrow(/não encontrado.*taupe/);
  });

  it("recusa nome que sai da pasta de temas", () => {
    expect(() => readThemeFile("../package", root)).toThrow(/Nome de tema inválido/);
    expect(() => readThemeFile("a/b", root)).toThrow(/Nome de tema inválido/);
  });

  it("usa process.cwd() quando a raiz não é informada", () => {
    expect(readThemeFile("taupe").name).toBe("taupe");
  });
});

describe("firstFontFamily", () => {
  it("devolve a primeira família sem aspas", () => {
    expect(firstFontFamily('"DM Sans", sans-serif')).toBe("DM Sans");
    expect(firstFontFamily(undefined)).toBeUndefined();
    expect(firstFontFamily("")).toBeUndefined();
  });
});
