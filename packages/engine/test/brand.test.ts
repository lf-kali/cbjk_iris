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

  it("defesa em profundidade: um valor com </style não fecha a tag no <head> (o schema já recusa)", () => {
    const theme = resolveSiteTheme("neutral", {
      colors: {},
      radius: "1rem</style><script>alert(1)</script>",
      overrides: { dark: { primary: "red</STYLE ><img src=x onerror=alert(1)>" } },
    });
    const css = renderThemeCss(theme);
    expect(css).not.toMatch(/<\/style/i);
    expect(css).toContain("<\\/style><script>");
    expect(css).toContain("<\\/STYLE >");
  });

  it("para entrada válida o CSS não muda", () => {
    const css = renderThemeCss(resolveSiteTheme("neutral", { colors: { primary: "#1d4ed8" }, radius: "0.5rem" }));
    expect(css).toContain("--radius:0.5rem;");
    expect(css).not.toContain("\\");
  });
});
