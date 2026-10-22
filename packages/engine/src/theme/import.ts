// ImportTheme (SPEC §5.6): o ex-theme:add (apps/site/scripts/add-theme.mjs), sem escrever.
// Regras de segurança (o CSS baixado vai para o <head> de todas as páginas do site):
// - só https:, inclusive em cada redirecionamento (manual, até 3); sem usuário e senha na URL;
// - 15 s no total e corpo de até 256 KiB, lido em streaming e cortado ao passar do limite;
// - o CSS é reconstruído do zero: só declarações de variáveis em :root e .dark, com nome na lista
//   permitida (tokens de cor, de forma, fontes, sombras, tracking...) e valor que passa no cssValue do
//   schema (fontes têm regra própria, porque nomes de família usam aspas). @import, url(), outras
//   regras e qualquer outra coisa do arquivo somem;
// - erros nunca repetem o conteúdo baixado.
// writeThemeFile grava o resultado em themes/<nome>.css, recusando link simbólico.
import { randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  COLOR_TOKENS,
  cssValue,
  IRIS_STYLE_VAR,
  SHAPE_TOKEN_KEYS,
  slugSchema,
  STYLE_IDS,
  type FileChange,
  type ImportTheme,
  type ImportThemeSource,
} from "@cbjk_iris/schema";

export const MAX_THEME_BYTES = 256 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

type Vars = Record<string, string>;

const SHADOWS = ["shadow", "shadow-2xs", "shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl"];
const SHADOW_PARTS = ["shadow-color", "shadow-opacity", "shadow-blur", "shadow-spread", "shadow-offset-x", "shadow-offset-y"];
const TRACKING = ["tracking-tighter", "tracking-tight", "tracking-normal", "tracking-wide", "tracking-wider", "tracking-widest"];
const FONTS = ["font-sans", "font-serif", "font-mono"];
const STYLE_VAR = IRIS_STYLE_VAR.slice(2);

/** Variáveis que um tema importado pode definir. */
export const THEME_VARIABLES: ReadonlySet<string> = new Set([
  ...COLOR_TOKENS, "destructive-foreground", "radius", ...SHAPE_TOKEN_KEYS, ...FONTS, "spacing", "letter-spacing",
  ...TRACKING, ...SHADOWS, ...SHADOW_PARTS, STYLE_VAR,
]);

const VAR_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Lista de famílias: nomes sem aspas (letras, números, espaço, hífen) ou entre aspas simples/duplas.
// Validada item a item depois de separar pelas vírgulas: uma regex só para a lista inteira tinha
// backtracking catastrófico ("a ,a ,a ,...!" travava o processo).
const FAMILY = /^(?:[A-Za-z0-9-][A-Za-z0-9 -]*|'[A-Za-z0-9 -]+'|"[A-Za-z0-9 -]+")$/;

function fontListOk(value: string): boolean {
  return value.length <= 400 && value.split(",").every((item) => FAMILY.test(item.trim()));
}

function valueOk(name: string, value: string): boolean {
  if (FONTS.includes(name)) return fontListOk(value);
  if (name === STYLE_VAR) return (STYLE_IDS as readonly string[]).includes(value);
  return cssValue.safeParse(value).success;
}

// --- origem e nome ---

// <nome>.css com estes nomes não pode ser criado no Windows (CON.css também é reservado)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function validName(name: unknown, what: string): string {
  if (typeof name !== "string" || !slugSchema.safeParse(name).success) {
    throw new Error(`${what}: nome inválido. Use letras minúsculas, números e hífens, sem "/" nem ".." (ex.: ocean-breeze)`);
  }
  if (WINDOWS_RESERVED.test(name)) throw new Error(`${what}: "${name}" é um nome reservado do Windows. Escolha outro (ex.: ${name}-tema)`);
  return name;
}

function assertHttps(url: URL, redirected: boolean) {
  if (url.protocol !== "https:") {
    throw new Error(`${redirected ? "redirecionamento para um endereço que não é https" : "endereço recusado"}: só https (sem http:, file:, data:...)`);
  }
  if (url.username || url.password) throw new Error("endereço com usuário ou senha não é aceito");
}

function resolveSource(source: ImportThemeSource): { url: URL; name: string; kind: "tweakcn" | "shadcn" | "url" } {
  const given = (["tweakcn", "url", "shadcn"] as const).filter((k) => typeof (source as Record<string, unknown>)?.[k] === "string");
  if (given.length !== 1) throw new Error("informe exatamente uma origem: tweakcn, url ou shadcn");
  const kind = given[0];
  if (kind === "tweakcn") {
    const name = validName(source.tweakcn, "tema do tweakcn");
    return { url: new URL(`https://tweakcn.com/r/themes/${name}.json`), name, kind };
  }
  if (kind === "shadcn") {
    const name = validName(source.shadcn, "cor do shadcn");
    return { url: new URL(`https://ui.shadcn.com/r/colors/${name}.json`), name, kind };
  }
  let url: URL;
  try {
    url = new URL(source.url as string);
  } catch {
    throw new Error("endereço inválido: use uma URL completa, começando com https://");
  }
  assertHttps(url, false);
  const base = path.posix.basename(url.pathname).replace(/\.(json|css)$/i, "");
  return { url, name: slugSchema.safeParse(base).success ? base : "", kind };
}

// --- rede ---

// Erro nosso (limite de tamanho): o download o relança como está. Qualquer outro erro do stream é de rede.
class TooLargeError extends Error {}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_THEME_BYTES) {
      await reader.cancel();
      throw new TooLargeError(`o arquivo baixado passa de ${MAX_THEME_BYTES / 1024} KiB: não parece um tema`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const isTimeout = (error: unknown) => ["TimeoutError", "AbortError"].includes((error as Error)?.name);
const TIMEOUT_MESSAGE = `o download passou de ${TIMEOUT_MS / 1000} s`;

async function download(start: URL): Promise<string> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; ; hop++) {
    let res: Response;
    try {
      res = await fetch(url.href, { redirect: "manual", signal, headers: { accept: "application/json, text/css;q=0.9" } });
    } catch (error) {
      if (isTimeout(error)) throw new Error(TIMEOUT_MESSAGE);
      throw new Error(`não consegui baixar de ${url.hostname} (falha de rede)`);
    }
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      if (hop >= MAX_REDIRECTS) throw new Error(`mais de ${MAX_REDIRECTS} redirecionamentos: desisti`);
      const location = res.headers.get("location");
      if (!location) throw new Error(`${url.hostname} respondeu HTTP ${res.status} sem endereço de destino`);
      url = new URL(location, url);
      assertHttps(url, true);
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`${url.hostname} respondeu HTTP ${res.status}`);
    }
    try {
      return await readCapped(res);
    } catch (error) {
      // o sinal também vale durante a leitura do corpo: o mesmo texto em pt-BR, não o do Node
      if (error instanceof TooLargeError) throw error;
      if (isTimeout(error)) throw new Error(TIMEOUT_MESSAGE);
      // TypeError("terminated"), ECONNRESET, valor que nem é Error: a mesma mensagem do fetch, sem o texto cru
      throw new Error(`não consegui baixar de ${url.hostname} (falha de rede)`);
    }
  }
}

// --- conteúdo ---

const asVars = (value: unknown): Vars =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Vars) : {};

function fromRegistry(data: Record<string, unknown>, kind: string): [Vars, Vars] {
  const vars = asVars(data.cssVarsV4 ?? data.cssVars) as unknown as Record<string, unknown>;
  // as paletas do shadcn não definem fonte; Geist é a fonte padrão do shadcn
  const light = { ...(kind === "shadcn" ? { "font-sans": "Geist, sans-serif" } : {}), ...asVars(vars.theme), ...asVars(vars.light) };
  return [light, { ...asVars(vars.dark) }];
}

// Primeiro bloco "<seletor> { ... }" (seletor no começo, depois de espaço ou de "}"), sem regex:
// /:root\s*\{([^}]*)\}/ era quadrática num CSS com milhares de ":root {" sem fechar (~3,7 s).
function blockBody(css: string, selector: string): string | null {
  for (let from = 0; ; ) {
    const at = css.indexOf(selector, from);
    if (at < 0) return null;
    from = at + 1;
    if (at > 0 && !/[\s}]/.test(css[at - 1])) continue;
    let j = at + selector.length;
    while (j < css.length && /\s/.test(css[j])) j++;
    if (css[j] !== "{") continue;
    const close = css.indexOf("}", j);
    return close < 0 ? null : css.slice(j + 1, close);
  }
}

function cssBlock(css: string, selector: string): Vars {
  const body = blockBody(css, selector);
  const vars: Vars = {};
  if (body === null) return vars;
  // sem regex com quantificador preguiçoso: "--a: x" seguido de 200 mil espaços levava ~18 s
  for (const declaration of body.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (name.startsWith("--") && value) vars[name.slice(2)] = value;
  }
  return vars;
}

function fromCss(text: string): [Vars, Vars] {
  const css = stripComments(text);
  return [cssBlock(css, ":root"), cssBlock(css, ".dark")];
}

// comentários /* ... */ removidos por varredura (comentário sem fim vai até o fim do texto)
function stripComments(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; ) {
    const open = text.indexOf("/*", i);
    if (open < 0) return out + text.slice(i);
    out += text.slice(i, open);
    const close = text.indexOf("*/", open + 2);
    if (close < 0) return out;
    i = close + 2;
  }
  return out;
}

function parseTheme(text: string, kind: string): [Vars, Vars] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fromCss(text);
  }
  return data && typeof data === "object" && !Array.isArray(data) ? fromRegistry(data as Record<string, unknown>, kind) : [{}, {}];
}

interface Filtered {
  kept: [string, string][];
  dropped: string[];
  badNames: number;
}

function filterVars(vars: Vars): Filtered {
  const out: Filtered = { kept: [], dropped: [], badNames: 0 };
  for (const [name, raw] of Object.entries(vars)) {
    if (!VAR_NAME.test(name)) out.badNames++;
    else if (THEME_VARIABLES.has(name) && typeof raw === "string" && valueOk(name, raw.trim())) out.kept.push([name, raw.trim()]);
    else out.dropped.push(`--${name}`);
  }
  return out;
}

const block = (selector: string, vars: [string, string][]) =>
  `${selector} {\n${vars.map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}\n`;

function renderTheme(name: string, host: string, light: Filtered, dark: Filtered): string {
  const dropped = [...new Set([...light.dropped, ...dark.dropped])].sort();
  const bad = light.badNames + dark.badNames;
  const parts = [dropped.join(", "), bad ? `${dropped.length ? "e " : ""}${bad} com nome inválido` : ""].filter(Boolean);
  const header = [`/* tema "${name}" importado de ${host} */`, parts.length ? `/* descartadas: ${parts.join("; ")} */` : null]
    .filter(Boolean)
    .join("\n");
  return `${header}\n${block(":root", light.kept)}\n${block(".dark", dark.kept)}`;
}

export const importTheme: ImportTheme = async (source, as) => {
  const { url, name: derived, kind } = resolveSource(source);
  const name = validName(as ?? derived, as === undefined ? "nome tirado do endereço (use --as <nome>)" : "--as");
  const [light, dark] = parseTheme(await download(url), kind).map(filterVars);
  const hasBackground = (f: Filtered) => f.kept.some(([k]) => k === "background");
  if (!hasBackground(light) || !hasBackground(dark)) {
    throw new Error("o arquivo baixado não tem os blocos :root e .dark com --background válido (formato do tweakcn, do shadcn ou CSS com variáveis)");
  }
  // o hostname vem do parser de URL (só caracteres de host): seguro dentro do comentário
  return { name, css: renderTheme(name, url.hostname, light, dark) };
};

// --- gravação ---

function lstatOrNull(abs: string) {
  try {
    return lstatSync(abs);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Grava themes/<nome>.css de forma atômica. Recusa link simbólico e não sobrescreve sem force. */
export function writeThemeFile(root: string, name: string, css: string, opts?: { force?: boolean }): FileChange {
  validName(name, "tema");
  const dir = path.join(path.resolve(/* turbopackIgnore: true */ root), "themes");
  const dirStat = lstatOrNull(dir);
  if (dirStat?.isSymbolicLink()) throw new Error("themes/ é um link simbólico: o tema não é gravado através dele");
  if (dirStat && !dirStat.isDirectory()) throw new Error("themes precisa ser uma pasta");
  if (!dirStat) mkdirSync(dir);
  const file = path.join(dir, `${name}.css`);
  const rel = `themes/${name}.css`;
  const fileStat = lstatOrNull(file);
  if (fileStat?.isSymbolicLink()) throw new Error(`${rel} é um link simbólico: não é sobrescrito`);
  if (fileStat && !fileStat.isFile()) throw new Error(`${rel} precisa ser um arquivo comum`);
  if (fileStat && !opts?.force) throw new Error(`${rel} já existe: use --force para sobrescrever`);
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    writeFileSync(tmp, css, { flag: "wx" });
    renameSync(tmp, file);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        unlinkSync(tmp);
      } catch {
        // o temporário pode nem ter sido criado
      }
    }
  }
  return { path: rel, action: fileStat ? "update" : "create" };
}
