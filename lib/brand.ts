import { clampChroma, converter, formatCss, parse, wcagContrast } from "culori";
// imports relativos com .ts: o scripts/sync-brand.mjs importa este arquivo direto pelo Node
import type { BrandConfig, ColorToken, ColorTokens } from "../types/site-config.ts";
import { COLOR_TOKENS } from "../types/site-config.ts";
import { NEUTRAL_SCALES } from "./brand-scales.ts";

const toOklch = converter("oklch");

const WHITE = "oklch(1 0 0)";
const DESTRUCTIVE = { light: "oklch(0.577 0.245 27.325)", dark: "oklch(0.704 0.191 22.216)" };

function color(value: string) {
  const parsed = parse(value);
  if (!parsed) throw new Error(`Cor inválida em siteConfig.brand: "${value}"`);
  return parsed;
}

/** Texto sobre um fundo: prefere o claro quando ele tem pelo menos 3:1, senão o de maior contraste. */
function pickForeground(background: string, light: string, dark: string) {
  const bg = color(background);
  const onLight = wcagContrast(color(light), bg);
  if (onLight >= 3) return light;
  return wcagContrast(color(dark), bg) > onLight ? dark : light;
}

/** Mesma cor com outra luminosidade (OKLCH), para o modo escuro. */
function withLightness(value: string, l: number) {
  const c = toOklch(color(value));
  return formatCss(clampChroma({ ...c, l }, "oklch"));
}

/** Deriva as variáveis do shadcn (claro e escuro) a partir das cores da marca. */
export function deriveBrandTokens(brand: BrandConfig): { light: ColorTokens; dark: ColorTokens } {
  const n = NEUTRAL_SCALES[brand.colors.neutral];
  const primary = brand.colors.primary ?? n[900];
  const { cta, highlight } = brand.colors;
  const primaryIsNeutral = (toOklch(color(primary)).c ?? 0) < 0.03;

  const brandFills = {
    cta,
    "cta-foreground": pickForeground(cta, WHITE, n[950]),
    highlight,
    "highlight-foreground": pickForeground(highlight, WHITE, n[950]),
  };

  const light: ColorTokens = {
    background: WHITE,
    foreground: n[950],
    card: WHITE,
    "card-foreground": n[950],
    popover: WHITE,
    "popover-foreground": n[950],
    primary,
    "primary-foreground": pickForeground(primary, n[50], n[900]),
    ...brandFills,
    secondary: n[100],
    "secondary-foreground": n[900],
    muted: n[100],
    "muted-foreground": n[500],
    accent: n[100],
    "accent-foreground": n[900],
    destructive: DESTRUCTIVE.light,
    border: n[200],
    input: n[200],
    ring: n[400],
    "chart-1": n[300],
    "chart-2": n[500],
    "chart-3": n[600],
    "chart-4": n[700],
    "chart-5": n[800],
    sidebar: n[50],
    "sidebar-foreground": n[950],
    "sidebar-primary": primary,
    "sidebar-primary-foreground": pickForeground(primary, n[50], n[900]),
    "sidebar-accent": n[100],
    "sidebar-accent-foreground": n[900],
    "sidebar-border": n[200],
    "sidebar-ring": n[400],
  };

  // primária neutra (quase cinza) vira o tom claro da escala; colorida só clareia se sumir no fundo escuro
  const darkPrimary = primaryIsNeutral
    ? n[200]
    : wcagContrast(color(primary), color(n[950])) >= 3
      ? primary
      : withLightness(primary, 0.72);
  const darkPrimaryForeground = primaryIsNeutral ? n[900] : pickForeground(darkPrimary, n[50], n[900]);

  const dark: ColorTokens = {
    background: n[950],
    foreground: n[50],
    card: n[900],
    "card-foreground": n[50],
    popover: n[900],
    "popover-foreground": n[50],
    primary: darkPrimary,
    "primary-foreground": darkPrimaryForeground,
    ...brandFills,
    secondary: n[800],
    "secondary-foreground": n[50],
    muted: n[800],
    "muted-foreground": n[400],
    accent: n[800],
    "accent-foreground": n[50],
    destructive: DESTRUCTIVE.dark,
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: n[500],
    "chart-1": n[300],
    "chart-2": n[500],
    "chart-3": n[600],
    "chart-4": n[700],
    "chart-5": n[800],
    sidebar: n[900],
    "sidebar-foreground": n[50],
    "sidebar-primary": darkPrimary,
    "sidebar-primary-foreground": darkPrimaryForeground,
    "sidebar-accent": n[800],
    "sidebar-accent-foreground": n[50],
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": n[500],
  };

  return {
    light: { ...light, ...brand.overrides?.light },
    dark: { ...dark, ...brand.overrides?.dark },
  };
}

function declarations(tokens: ColorTokens) {
  return COLOR_TOKENS.map((name) => `--${name}:${tokens[name]};`).join("");
}

/** CSS com as variáveis da marca, injetado no <head> pelo layout. */
export function renderBrandCss(brand: BrandConfig): string {
  const { light, dark } = deriveBrandTokens(brand);
  const radius = brand.radius ?? "0.625rem";
  return `:root{color-scheme:light;--radius:${radius};${declarations(light)}}.dark{color-scheme:dark;${declarations(dark)}}`;
}

// Pares texto/fundo conferidos; texto pequeno pede 4.5:1 (WCAG AA).
const CONTRAST_PAIRS: [ColorToken, ColorToken][] = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["card-foreground", "card"],
  ["primary-foreground", "primary"],
  ["cta-foreground", "cta"],
  ["highlight-foreground", "highlight"],
];

export function contrastReport(brand: BrandConfig) {
  const tokens = deriveBrandTokens(brand);
  return (["light", "dark"] as const).flatMap((mode) =>
    CONTRAST_PAIRS.map(([fg, bg]) => ({
      mode,
      pair: `${fg} / ${bg}`,
      ratio: wcagContrast(color(tokens[mode][fg]), color(tokens[mode][bg])),
    })).filter((r) => r.ratio < 4.5),
  );
}
