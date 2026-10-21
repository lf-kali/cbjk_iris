// Lista de tokens de forma e de estilos (SPEC §5.4). Dono: iris-architect.
// Os VALORES de cada preset ficam com o iris-theme, em packages/engine/src/theme/styles.ts.
// Sem zod: entra no subpath ./defaults.
//
// "sera" é o padrão do estilo sera, igual ao visual de hoje. Alguns padrões são expressões
// (var(), calc(), color-mix()): quem valida faixa (ValidateTheme) precisa aceitar expressão.

type LengthUnit = "px" | "rem" | "em";

export type ShapeTokenSpec =
  | { name: `--${string}`; kind: "length"; min: string; max: string; units?: readonly LengthUnit[]; sera: string }
  | { name: `--${string}`; kind: "percentage" | "number"; min: number; max: number; sera: string }
  | { name: `--${string}`; kind: "color" | "shadow"; sera: string }
  | { name: `--${string}`; kind: "keyword"; values: readonly string[]; sera: string };

const CASE = ["uppercase", "none"] as const;

export const SHAPE_TOKENS = [
  { name: "--radius", kind: "length", min: "0", max: "2rem", sera: "0.625rem" }, // o do tema, se houver
  { name: "--radius-control", kind: "length", min: "0", max: "9999px", sera: "0px" },
  { name: "--radius-card", kind: "length", min: "0", max: "3rem", sera: "0px" },
  { name: "--radius-media", kind: "length", min: "0", max: "3rem", sera: "0px" },
  { name: "--radius-surface", kind: "length", min: "0", max: "3rem", sera: "var(--radius)" },
  { name: "--radius-field", kind: "length", min: "0", max: "9999px", sera: "calc(var(--radius) * 0.8)" },
  { name: "--radius-card-compact", kind: "length", min: "0", max: "3rem", sera: "0.125rem" },
  { name: "--border-width", kind: "length", min: "0", max: "4px", sera: "1px" },
  { name: "--surface-border-width", kind: "length", min: "0", max: "4px", sera: "1px" },
  { name: "--card-ring-width", kind: "length", min: "0", max: "4px", sera: "1px" },
  { name: "--card-ring-color", kind: "color", sera: "color-mix(in oklab, var(--foreground) 5%, transparent)" },
  { name: "--popover-ring-color", kind: "color", sera: "color-mix(in oklab, var(--foreground) 10%, transparent)" },
  { name: "--shadow-card", kind: "shadow", sera: "var(--shadow-sm)" },
  { name: "--shadow-card-hover", kind: "shadow", sera: "var(--shadow-md)" },
  { name: "--shadow-overlay", kind: "shadow", sera: "var(--shadow-md)" },
  { name: "--shadow-control", kind: "shadow", sera: "var(--shadow-xs)" },
  { name: "--surface-alpha", kind: "percentage", min: 0, max: 100, sera: "100%" },
  { name: "--blur", kind: "length", min: "0", max: "24px", sera: "0px" },
  { name: "--header-alpha", kind: "percentage", min: 0, max: 100, sera: "86%" },
  { name: "--header-blur", kind: "length", min: "0", max: "40px", sera: "40px" },
  { name: "--overlay-alpha", kind: "percentage", min: 0, max: 100, sera: "20%" },
  { name: "--overlay-blur", kind: "length", min: "0", max: "24px", sera: "8px" },
  { name: "--density", kind: "number", min: 0.75, max: 1.25, sera: "1" },
  { name: "--control-case", kind: "keyword", values: CASE, sera: "uppercase" },
  { name: "--control-tracking", kind: "length", min: "0em", max: "0.2em", units: ["em"], sera: "0.1em" },
  { name: "--control-weight", kind: "number", min: 400, max: 800, sera: "600" },
  { name: "--title-case", kind: "keyword", values: CASE, sera: "uppercase" },
  { name: "--title-tracking", kind: "length", min: "0em", max: "0.2em", units: ["em"], sera: "0.05em" },
  { name: "--label-case", kind: "keyword", values: CASE, sera: "uppercase" },
  { name: "--label-tracking", kind: "length", min: "0em", max: "0.2em", units: ["em"], sera: "0.025em" },
  { name: "--ring-width", kind: "length", min: "1px", max: "4px", sera: "2px" },
] as const satisfies readonly ShapeTokenSpec[];

export type ShapeTokenName = (typeof SHAPE_TOKENS)[number]["name"];
/** Nome sem o "--", usado como chave em brand.shape (ex.: "radius-control"). */
export type ShapeTokenKey = ShapeTokenName extends `--${infer K}` ? K : never;
export type ShapeTokens = Record<ShapeTokenKey, string>;

export const SHAPE_TOKEN_KEYS = SHAPE_TOKENS.map((t) => t.name.slice(2)) as unknown as readonly [ShapeTokenKey, ...ShapeTokenKey[]];

/** Estilos embutidos (Q-09). */
export const STYLE_IDS = ["sera", "soft", "glass", "flat"] as const;
export type StyleId = (typeof STYLE_IDS)[number];
export const DEFAULT_STYLE_ID: StyleId = "sera";

/** Variável do tema que diz o estilo preferido dele (no :root). */
export const IRIS_STYLE_VAR = "--iris-style";

/**
 * Utilitários congelados do §5.4, definidos no iris.css do core. Mesma lista do "utilities"
 * de docs/spec/style-inventory.json (um teste confere).
 */
export const FROZEN_UTILITIES = [
  "rounded-control", "rounded-card", "rounded-media", "rounded-surface", "rounded-surface-lg", "rounded-field",
  "rounded-card-compact", "shadow-card", "shadow-card-hover", "shadow-overlay", "shadow-control", "surface-card",
  "surface-popover", "surface-header", "surface-overlay", "border-control", "border-surface", "border-selected",
  "divider-t", "divider-b", "divider-l", "divider-r", "divider-between-y", "ring-focus", "py-section", "p-card",
  "gap-density", "weight-control", "case-control", "case-control-compact", "case-title", "case-label",
] as const;
export type FrozenUtility = (typeof FROZEN_UTILITIES)[number];
