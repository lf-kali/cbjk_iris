import { describe, expect, it } from "vitest";
import { contrastReport, renderThemeCss, resolveSiteTheme } from "../src/theme/brand";

// Teste de fumaça do motor movido de lib/brand.ts: o comportamento não muda na migração (E2).
describe("brand (movido de lib/brand.ts)", () => {
  it("monta o tema embutido com as cores da marca por cima", () => {
    const theme = resolveSiteTheme("taupe", { colors: { primary: "#1d4ed8" } });
    expect(theme.themeName).toBe("taupe");
    expect(theme.light.primary).toBe("#1d4ed8");
    expect(theme.light.cta).toBe("#1d4ed8");
    const css = renderThemeCss(theme);
    expect(css).toMatch(/^:root\{color-scheme:light;--radius:/);
    expect(css).toContain(".dark{color-scheme:dark;");
  });

  it("sem cor de marca, cta e highlight vêm do tema", () => {
    const theme = resolveSiteTheme("neutral", { colors: {} });
    expect(theme.light.cta).toBe(theme.light.primary);
    expect(theme.light.highlight).toBe(theme.light.destructive);
    expect(Array.isArray(contrastReport(theme))).toBe(true);
  });
});
