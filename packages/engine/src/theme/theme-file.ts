// Lê um tema em themes/<nome>.css no formato do tweakcn/shadcn: um bloco :root (claro)
// e um bloco .dark (escuro) com variáveis CSS. Outros blocos (ex.: @theme inline) são ignorados.
// Procura primeiro em themes/ do projeto e depois nos temas embutidos do engine (SPEC §5.1.3).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { BUILTIN_THEMES_DIR } from "../paths";

export type ThemeVars = Record<string, string>;

export interface ThemeFile {
  name: string;
  light: ThemeVars;
  dark: ThemeVars;
}

/** Pastas de tema em ordem de prioridade: a do projeto ganha da embutida com o mesmo nome. */
function themeDirs(root: string): string[] {
  return [path.join(root, "themes"), BUILTIN_THEMES_DIR];
}

function cssNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".css"))
    .map((file) => file.slice(0, -4));
}

export function availableThemes(root: string = process.cwd()): string[] {
  return [...new Set(themeDirs(root).flatMap(cssNames))].sort();
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

export function readThemeFile(name: string, root: string = process.cwd()): ThemeFile {
  // o nome vira caminho de arquivo: nada de separador nem ".." (ficaria fora das pastas de tema)
  if (!name || name !== path.basename(name) || name.includes("\\") || name.startsWith(".")) {
    throw new Error(`Nome de tema inválido: "${name}". Use só o nome do arquivo, sem pasta (ex.: "taupe").`);
  }
  const file = themeDirs(root)
    .map((dir) => path.join(dir, `${name}.css`))
    .find((candidate) => existsSync(candidate));
  if (!file) {
    throw new Error(
      `Tema "${name}" não encontrado em themes/ nem nos temas embutidos. Disponíveis: ${availableThemes(root).join(", ")}`,
    );
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
