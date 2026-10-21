import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FROZEN_UTILITIES, IRIS_STYLE_VAR, SHAPE_TOKENS, SHAPE_TOKEN_KEYS, STYLE_IDS, DEFAULT_STYLE_ID } from "../src";

// Os 31 tokens da tabela do §5.4 (SPEC), na ordem da tabela
const EXPECTED = [
  "--radius", "--radius-control", "--radius-card", "--radius-media", "--radius-surface", "--radius-field",
  "--radius-card-compact", "--border-width", "--surface-border-width", "--card-ring-width", "--card-ring-color",
  "--popover-ring-color", "--shadow-card", "--shadow-card-hover", "--shadow-overlay", "--shadow-control",
  "--surface-alpha", "--blur", "--header-alpha", "--header-blur", "--overlay-alpha", "--overlay-blur", "--density",
  "--control-case", "--control-tracking", "--control-weight", "--title-case", "--title-tracking", "--label-case",
  "--label-tracking", "--ring-width",
];

describe("SHAPE_TOKENS", () => {
  it("são os 31 tokens da spec, sem repetição", () => {
    expect(SHAPE_TOKENS.map((t) => t.name)).toEqual(EXPECTED);
    expect(new Set(EXPECTED).size).toBe(31);
    expect(SHAPE_TOKEN_KEYS).toEqual(EXPECTED.map((n) => n.slice(2)));
  });

  it("cada token tem tipo e padrão do sera; faixas coerentes com o tipo", () => {
    for (const t of SHAPE_TOKENS) {
      expect(t.sera.length, t.name).toBeGreaterThan(0);
      if (t.kind === "length") expect(typeof t.min === "string" && typeof t.max === "string", t.name).toBe(true);
      if (t.kind === "percentage" || t.kind === "number") expect(t.min < t.max, t.name).toBe(true);
      if (t.kind === "keyword") expect(t.values, t.name).toContain(t.sera);
    }
  });

  it("padrões do sera que reproduzem o visual de hoje (amostra da tabela)", () => {
    const sera = Object.fromEntries(SHAPE_TOKENS.map((t) => [t.name, t.sera]));
    expect(sera["--radius-control"]).toBe("0px");
    expect(sera["--radius-surface"]).toBe("var(--radius)");
    expect(sera["--header-alpha"]).toBe("86%");
    expect(sera["--header-blur"]).toBe("40px");
    expect(sera["--control-case"]).toBe("uppercase");
    expect(sera["--ring-width"]).toBe("2px");
    expect(sera["--density"]).toBe("1");
  });
});

describe("estilos e utilitários", () => {
  it("STYLE_IDS são os 4 do Q-09, sera é o padrão", () => {
    expect(STYLE_IDS).toEqual(["sera", "soft", "glass", "flat"]);
    expect(DEFAULT_STYLE_ID).toBe("sera");
    expect(IRIS_STYLE_VAR).toBe("--iris-style");
  });

  it("FROZEN_UTILITIES é a mesma lista do style-inventory.json", () => {
    const json = JSON.parse(readFileSync(path.resolve(__dirname, "../../../docs/spec/style-inventory.json"), "utf8"));
    expect([...FROZEN_UTILITIES]).toEqual(json.utilities);
  });
});
