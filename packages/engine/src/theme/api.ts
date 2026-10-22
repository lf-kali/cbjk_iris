// Versão mínima de ListThemes, ListStyles e ValidateTheme (SPEC §5.6), entregue pelo arquiteto antes
// da tag para a CLI não esperar o tema. Depois da tag, o iris-theme evolui sem mudar as assinaturas.
// Exportado só pela raiz do engine (o ./theme, que o core importa, não muda).
import { existsSync } from "node:fs";
import path from "node:path";
import { parse } from "culori";
import {
  COLOR_TOKENS,
  IRIS_STYLE_VAR,
  SHAPE_TOKENS,
  STYLE_IDS,
  type Diagnostic,
  type ListStyles,
  type ListThemes,
  type ShapeTokenSpec,
  type StyleId,
  type StyleInfo,
  type ValidateTheme,
} from "@cbjk_iris/schema";
import { resolveSiteTheme } from "./brand";
import { availableThemes, readThemeFile, type ThemeVars } from "./theme-file";

const projectThemeFile = (root: string, name: string) => path.join(root, "themes", `${name}.css`);
const STYLE_VAR = IRIS_STYLE_VAR.slice(2);
const isStyle = (value: string | undefined): value is StyleId => (STYLE_IDS as readonly string[]).includes(value ?? "");

function themeStyle(name: string, root: string): StyleId | undefined {
  try {
    const value = readThemeFile(name, root).light[STYLE_VAR];
    return isStyle(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export const listThemes: ListThemes = (root) =>
  availableThemes(root).map((name) => {
    const style = themeStyle(name, root);
    return {
      name,
      source: existsSync(projectThemeFile(root, name)) ? "project" : "builtin",
      ...(style ? { style } : {}),
    };
  });

// Rótulos e descrições; os valores de cada preset são do iris-theme (packages/engine/src/theme/styles.ts).
const STYLES: Record<StyleId, Omit<StyleInfo, "id">> = {
  sera: { label: "Sera", description: "O visual padrão: controles e cartões de cantos retos, sombras discretas, títulos em caixa alta." },
  soft: { label: "Suave", description: "Cantos arredondados e sombras suaves." },
  glass: { label: "Vidro", description: "Superfícies translúcidas com desfoque." },
  flat: { label: "Plano", description: "Sem sombras, bordas finas e cantos discretos." },
};

export const listStyles: ListStyles = () => STYLE_IDS.map((id) => ({ id, ...STYLES[id] }));

// --- ValidateTheme: só parse e faixas ---

const EXPRESSION = /^[a-z-]+\(/i; // var(), calc(), color-mix()...: aceitas sem conferir faixa

function toPx(value: number, unit: string): number {
  return unit === "rem" || unit === "em" ? value * 16 : value;
}

function lengthProblem(value: string, spec: Extract<ShapeTokenSpec, { kind: "length" }>): string | null {
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(value);
  // sem unidade, só zero é comprimento válido em CSS (o navegador ignora "2" ou "0.5")
  if (!m || (!m[2] && Number(m[1]) !== 0)) return `comprimento inválido: use px, rem ou em (ex.: ${spec.sera})`;
  const unit = m[2] ?? "px";
  if (spec.units && !(spec.units as readonly string[]).includes(unit) && Number(m[1]) !== 0) {
    return `use a unidade ${spec.units.join(" ou ")}`;
  }
  const bound = (b: string) => {
    const bm = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(b)!;
    return toPx(Number(bm[1]), bm[2] ?? "px");
  };
  const px = toPx(Number(m[1]), unit);
  return px < bound(spec.min) || px > bound(spec.max) ? `fora da faixa ${spec.min} a ${spec.max}` : null;
}

function tokenProblem(value: string, spec: ShapeTokenSpec): string | null {
  if (EXPRESSION.test(value)) return null;
  switch (spec.kind) {
    case "length":
      return lengthProblem(value, spec);
    case "percentage": {
      const m = /^(\d*\.?\d+)%$/.exec(value);
      if (!m) return "use uma porcentagem (ex.: 86%)";
      return Number(m[1]) < spec.min || Number(m[1]) > spec.max ? `fora da faixa ${spec.min}% a ${spec.max}%` : null;
    }
    case "number": {
      // forma decimal do CSS antes de converter: Number() aceitaria 0x1, 0b1 e "Infinity"
      if (!/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(value)) return "use um número";
      const n = Number(value);
      return n < spec.min || n > spec.max ? `fora da faixa ${spec.min} a ${spec.max}` : null;
    }
    case "keyword":
      return (spec.values as readonly string[]).includes(value) ? null : `use ${spec.values.join(" ou ")}`;
    case "color":
      return parse(value) ? null : "cor inválida";
    case "shadow":
      return null;
  }
}

function shapeDiagnostics(file: string, modes: [string, ThemeVars][]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const spec of SHAPE_TOKENS) {
    for (const [mode, vars] of modes) {
      const value = vars[spec.name.slice(2)];
      if (value === undefined) continue;
      const problem = tokenProblem(value, spec);
      if (problem) out.push({ level: "error", file, path: spec.name, message: `${problem} (${mode}: ${value.slice(0, 80)})` });
    }
  }
  return out;
}

function colorDiagnostics(file: string, modes: [string, ThemeVars][]): Diagnostic[] {
  return COLOR_TOKENS.flatMap((token) =>
    modes.flatMap(([mode, vars]): Diagnostic[] => {
      const value = vars[token];
      // ausente, expressão (var(), color-mix()...) ou cor que o culori entende: ok
      if (value === undefined || EXPRESSION.test(value) || parse(value)) return [];
      return [{ level: "error", file, path: `--${token}`, message: `cor inválida (${mode}: ${value.slice(0, 80)})` }];
    }),
  );
}

export const validateTheme: ValidateTheme = (root, name) => {
  const file = existsSync(projectThemeFile(root, name)) ? `themes/${name}.css` : `@cbjk_iris/engine/themes/${name}.css`;
  let theme;
  try {
    theme = readThemeFile(name, root);
  } catch (error) {
    return [{ level: "error", file: `themes/${name}.css`, message: (error as Error).message }];
  }
  const diagnostics: Diagnostic[] = [];
  try {
    // o motor monta as cores dos dois modos: token faltando e cor que não faz parse lançam aqui
    resolveSiteTheme(name, { colors: {} }, root);
  } catch (error) {
    diagnostics.push({ level: "error", file, message: (error as Error).message });
  }
  const modes: [string, ThemeVars][] = [[":root", theme.light], [".dark", theme.dark]];
  diagnostics.push(...colorDiagnostics(file, modes), ...shapeDiagnostics(file, modes));
  const style = theme.light[STYLE_VAR];
  if (style !== undefined && !isStyle(style)) {
    diagnostics.push({ level: "error", file, path: IRIS_STYLE_VAR, message: `estilo desconhecido: use ${STYLE_IDS.join(", ")}` });
  }
  return diagnostics;
};
