// Lê um tema em themes/<nome>.css no formato do tweakcn/shadcn: um bloco :root (claro)
// e um bloco .dark (escuro) com variáveis CSS. Outros blocos (ex.: @theme inline) são ignorados.
// Importado direto pelo Node em scripts/sync-brand.mjs, por isso sem alias "@/".
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type ThemeVars = Record<string, string>;

export interface ThemeFile {
  name: string;
  light: ThemeVars;
  dark: ThemeVars;
}

const THEMES_DIR = path.join(process.cwd(), "themes");

export function availableThemes(): string[] {
  if (!existsSync(THEMES_DIR)) return [];
  return readdirSync(THEMES_DIR)
    .filter((file) => file.endsWith(".css"))
    .map((file) => file.slice(0, -4))
    .sort();
}

function parseBlock(css: string, selector: RegExp): ThemeVars {
  const match = css.match(selector);
  if (!match) return {};
  const vars: ThemeVars = {};
  for (const declaration of match[1].split(";")) {
    const m = declaration.match(/^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

export function readThemeFile(name: string): ThemeFile {
  const file = path.join(THEMES_DIR, `${name}.css`);
  if (!existsSync(file)) {
    throw new Error(`Tema "${name}" não encontrado em themes/. Disponíveis: ${availableThemes().join(", ")}`);
  }
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const light = parseBlock(css, /(?:^|[\s}]):root\s*\{([^}]*)\}/);
  const dark = parseBlock(css, /(?:^|[\s}])\.dark\s*\{([^}]*)\}/);
  if (!light.background || !dark.background) {
    throw new Error(`themes/${name}.css precisa de um bloco :root e um bloco .dark com as variáveis do shadcn.`);
  }
  return { name, light, dark };
}

/** Primeira família de uma lista CSS: '"DM Sans", sans-serif' -> 'DM Sans'. */
export function firstFontFamily(value: string | undefined): string | undefined {
  const first = value?.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || undefined;
}
