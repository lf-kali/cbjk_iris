import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { STYLE_IDS } from "@cbjk_iris/schema";
import { listStyles, listThemes, validateTheme } from "../src/theme/api";
import { cleanupProjects, makeProject } from "./helpers/project";

// Versão mínima de ListThemes, ListStyles e ValidateTheme (SPEC §5.6). Depois da tag, o iris-theme evolui.

afterEach(cleanupProjects);

const BUILTIN = ["caffeine", "elegant-luxury", "gray", "modern-minimal", "neutral", "ocean-breeze", "slate", "stone", "taupe", "zinc"];
const neutral = readFileSync(fileURLToPath(new URL("../themes/neutral.css", import.meta.url)), "utf8");

describe("listThemes", () => {
  it("os 10 embutidos, em ordem, com source builtin", () => {
    const root = makeProject();
    const themes = listThemes(root);
    expect(themes.map((t) => t.name)).toEqual(BUILTIN);
    expect(themes.every((t) => t.source === "builtin")).toBe(true);
  });

  it("tema do projeto aparece como project, inclusive quando sobrescreve um embutido; style vem do --iris-style", () => {
    const root = makeProject({}, {
      "themes/minha-marca.css": neutral.replace(":root {", ":root {\n  --iris-style: glass;"),
      "themes/neutral.css": neutral,
      "themes/estilo-ruim.css": neutral.replace(":root {", ":root {\n  --iris-style: inexistente;"),
    });
    const byName = Object.fromEntries(listThemes(root).map((t) => [t.name, t]));
    expect(byName["minha-marca"]).toEqual({ name: "minha-marca", source: "project", style: "glass" });
    expect(byName.neutral).toEqual({ name: "neutral", source: "project" });
    expect(byName["estilo-ruim"]).toEqual({ name: "estilo-ruim", source: "project" });
    expect(byName.taupe.source).toBe("builtin");
  });
});

describe("listStyles", () => {
  it("os 4 ids de STYLE_IDS, com rótulo e descrição", () => {
    const styles = listStyles();
    expect(styles.map((s) => s.id)).toEqual([...STYLE_IDS]);
    for (const s of styles) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });
});

describe("validateTheme", () => {
  it.each(BUILTIN)("o embutido %s é válido", (name) => {
    expect(validateTheme(makeProject(), name)).toEqual([]);
  });

  it("tema inexistente: erro", () => {
    expect(validateTheme(makeProject(), "nao-existe")).toEqual([expect.objectContaining({ level: "error", file: "themes/nao-existe.css" })]);
  });

  it("token de cor faltando ou cor que não faz parse: erro", () => {
    const root = makeProject({}, {
      "themes/sem-card.css": neutral.replace(/--card: [^;]+;/g, ""),
      "themes/cor-ruim.css": neutral.replace(/--primary: [^;]+;/, "--primary: nao-e-cor;"),
    });
    expect(validateTheme(root, "sem-card")).toEqual([expect.objectContaining({ level: "error", file: "themes/sem-card.css" })]);
    expect(validateTheme(root, "cor-ruim")[0]).toMatchObject({ level: "error" });
  });

  it("faixas dos tokens de forma: fora da faixa é erro, expressão é aceita", () => {
    const extra = [
      "--radius-control: 10000px;", // max 9999px
      "--blur: 2rem;", // 32px > 24px
      "--surface-alpha: 120%;",
      "--density: 2;",
      "--control-case: lowercase;",
      "--control-tracking: 1px;", // só em
      "--radius-field: calc(var(--radius) * 0.8);",
      "--card-ring-color: color-mix(in oklab, var(--foreground) 5%, transparent);",
      "--header-blur: 40px;",
    ];
    const root = makeProject({}, { "themes/faixas.css": neutral.replace(":root {", `:root {\n  ${extra.join("\n  ")}`) });
    const paths = validateTheme(root, "faixas").map((d) => d.path).sort();
    expect(paths).toEqual(["--blur", "--control-case", "--control-tracking", "--density", "--radius-control", "--surface-alpha"]);
  });

  it("comprimento sem unidade só vale para 0; número só na forma decimal do CSS", () => {
    const extra = [
      "--ring-width: 2;", // sem unidade: o navegador ignora
      "--radius-card: 0.5;",
      "--radius-control: 0;", // 0 sem unidade é válido
      "--radius-media: -0;",
      "--density: 0x1;", // Number() aceitaria
      "--surface-alpha: 50%;",
      "--control-weight: 1e0;", // forma decimal válida, mas fora da faixa 400-800
      "--header-alpha: 50%;",
    ];
    const root = makeProject({}, { "themes/unidades.css": neutral.replace(":root {", `:root {\n  ${extra.join("\n  ")}`) });
    const byPath = Object.fromEntries(validateTheme(root, "unidades").map((d) => [d.path, d.message]));
    expect(Object.keys(byPath).sort()).toEqual(["--control-weight", "--density", "--radius-card", "--ring-width"]);
    expect(byPath["--ring-width"]).toMatch(/comprimento inválido: use px, rem ou em/);
    expect(byPath["--radius-card"]).toMatch(/comprimento inválido: use px, rem ou em/);
    expect(byPath["--density"]).toMatch(/use um número/);
    expect(byPath["--control-weight"]).toMatch(/fora da faixa/);
  });

  it("número com ponto sem casas decimais (1.) não é CSS válido", () => {
    const root = makeProject({}, { "themes/ponto.css": neutral.replace(":root {", ":root {\n  --density: 1.;\n  --control-weight: 600.5;") });
    expect(validateTheme(root, "ponto")).toEqual([expect.objectContaining({ path: "--density", message: expect.stringMatching(/use um número/) })]);
  });

  it("--iris-style fora de STYLE_IDS: erro", () => {
    const root = makeProject({}, { "themes/estilo.css": neutral.replace(":root {", ":root {\n  --iris-style: neon;") });
    expect(validateTheme(root, "estilo")).toEqual([expect.objectContaining({ level: "error", path: "--iris-style" })]);
  });

  it("nome com .. ou /: erro, sem ler fora das pastas de tema", () => {
    expect(validateTheme(makeProject(), "../site.config")[0]).toMatchObject({ level: "error" });
  });
});
