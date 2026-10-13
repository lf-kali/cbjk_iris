// Monta as variáveis CSS do site: tema (themes/<nome>.css) + cores da marca por cima + sobrescritas.
// imports relativos com .ts: o scripts/sync-brand.mjs importa este arquivo direto pelo Node
import { clampChroma, converter, formatCss, parse, wcagContrast } from "culori";
import type { BrandConfig, ColorToken, ColorTokens } from "../types/site-config.ts";
import { COLOR_TOKENS } from "../types/site-config.ts";
import { readThemeFile, type ThemeVars } from "./theme-file.ts";

const toOklch = converter("oklch");

// padrões do Tailwind, para temas que não definem sombras (ex.: paletas do shadcn)
const DEFAULT_SHADOWS: Record<string, string> = {
  "shadow-2xs": "0 1px rgb(0 0 0 / 0.05)",
  "shadow-xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "shadow-sm": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  "shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  "shadow-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "shadow-2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
};
const EXTRA_VARS = [...Object.keys(DEFAULT_SHADOWS), "tracking-normal"];

type Mode = "light" | "dark";

// variáveis que não vêm do tema: derivadas da marca (ou da primária/destructive do tema)
const BRAND_TOKENS = { cta: 1, "cta-foreground": 1, highlight: 1, "highlight-foreground": 1 };

// temas sem as variáveis da barra lateral usam as cores básicas equivalentes
const SIDEBAR_FALLBACK: Partial<Record<ColorToken, ColorToken>> = {
  sidebar: "card",
  "sidebar-foreground": "card-foreground",
  "sidebar-primary": "primary",
  "sidebar-primary-foreground": "primary-foreground",
  "sidebar-accent": "accent",
  "sidebar-accent-foreground": "accent-foreground",
  "sidebar-border": "border",
  "sidebar-ring": "ring",
};

export interface SiteTheme {
  themeName: string;
  radius: string;
  light: ColorTokens;
  dark: ColorTokens;
  extra: { light: Record<string, string>; dark: Record<string, string> };
}

function color(value: string) {
  const parsed = parse(value);
  if (!parsed) throw new Error(`Cor inválida: "${value}"`);
  return parsed;
}

const lightness = (value: string) => toOklch(color(value)).l ?? 0;

/** Texto sobre um fundo: prefere o claro quando ele tem pelo menos 3:1, senão o de maior contraste. */
function pickForeground(background: string, a: string, b: string) {
  const [light, dark] = lightness(a) >= lightness(b) ? [a, b] : [b, a];
  const bg = color(background);
  const onLight = wcagContrast(color(light), bg);
  if (onLight >= 3) return light;
  return wcagContrast(color(dark), bg) > onLight ? dark : light;
}

function withLightness(value: string, l: number) {
  return formatCss(clampChroma({ ...toOklch(color(value)), l }, "oklch"));
}

function applyBrand(theme: ThemeVars, brand: BrandConfig, mode: Mode): ColorTokens {
  const t: Record<string, string> = { ...theme };
  for (const k of COLOR_TOKENS) {
    if (t[k] || k in BRAND_TOKENS) continue;
    const fallback = SIDEBAR_FALLBACK[k] && t[SIDEBAR_FALLBACK[k]];
    if (!fallback) throw new Error(`O tema não define --${k} no modo ${mode === "light" ? "claro (:root)" : "escuro (.dark)"}.`);
    t[k] = fallback;
  }

  const { primary, cta, highlight } = brand.colors;
  const onColor = (bg: string) => pickForeground(bg, t.background, t.foreground);

  if (primary) {
    // no escuro, uma primária que some no fundo é clareada
    const p = mode === "dark" && wcagContrast(color(primary), color(t.background)) < 3 ? withLightness(primary, 0.72) : primary;
    t.primary = p;
    t["primary-foreground"] = onColor(p);
    t["sidebar-primary"] = p;
    t["sidebar-primary-foreground"] = t["primary-foreground"];
  }

  t.cta = cta ?? t.primary;
  t["cta-foreground"] = cta ? onColor(cta) : t["primary-foreground"];
  t.highlight = highlight ?? t.destructive;
  t["highlight-foreground"] = highlight
    ? onColor(highlight)
    : (theme["destructive-foreground"] ?? onColor(t.destructive));

  const tokens = Object.fromEntries(COLOR_TOKENS.map((k) => [k, t[k]])) as ColorTokens;
  return { ...tokens, ...brand.overrides?.[mode] };
}

export function resolveSiteTheme(themeName: string, brand: BrandConfig): SiteTheme {
  const theme = readThemeFile(themeName);
  const extra = (vars: ThemeVars) =>
    Object.fromEntries(EXTRA_VARS.map((k) => [k, vars[k] ?? DEFAULT_SHADOWS[k] ?? "0em"]));

  return {
    themeName,
    radius: brand.radius ?? theme.light.radius ?? "0.625rem",
    light: applyBrand(theme.light, brand, "light"),
    dark: applyBrand(theme.dark, brand, "dark"),
    extra: { light: extra(theme.light), dark: extra({ ...theme.light, ...theme.dark }) },
  };
}

function declarations(tokens: Record<string, string>) {
  return Object.entries(tokens).map(([name, value]) => `--${name}:${value};`).join("");
}

/** CSS com as variáveis finais, injetado no <head> pelo layout. */
export function renderThemeCss(theme: SiteTheme): string {
  return (
    `:root{color-scheme:light;--radius:${theme.radius};${declarations(theme.light)}${declarations(theme.extra.light)}}` +
    `.dark{color-scheme:dark;${declarations(theme.dark)}${declarations(theme.extra.dark)}}`
  );
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

export function contrastReport(theme: SiteTheme) {
  return (["light", "dark"] as const).flatMap((mode) =>
    CONTRAST_PAIRS.map(([fg, bg]) => {
      let ratio = 21;
      try {
        ratio = wcagContrast(color(theme[mode][fg]), color(theme[mode][bg]));
      } catch {
        // cor que o culori não entende (ex.: var(...)): não dá para medir
      }
      return { mode, pair: `${fg} / ${bg}`, ratio };
    }).filter((r) => r.ratio < 4.5),
  );
}
