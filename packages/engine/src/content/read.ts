// Leitura segura de content/ (SPEC §5.3). Regras:
// - a raiz vem de process.cwd() ou da opção root; content/ precisa existir (cwd errado não vira site vazio);
// - em cada pasta, entradas que começam com "." são ignoradas (.gitkeep, .DS_Store); o resto precisa
//   ser um arquivo regular <slug>.json. Subpasta, link simbólico e nome fora do padrão são erro;
// - o nome do arquivo é o slug (ASCII, sem "/" nem ".."), então o caminho nunca sai da pasta;
// - link simbólico é recusado sem ler o alvo: lstat, O_NOFOLLOW ao abrir e realpath dentro de content/.
//   Assim a mensagem de erro do JSON.parse nunca mostra trecho de um arquivo de fora;
// - só arquivo regular: FIFO, socket e dispositivo são recusados no lstat, antes de abrir (um open de FIFO
//   bloquearia o build para sempre); O_NONBLOCK é a segunda barreira. Hard link (nlink > 1) é recusado:
//   seria um jeito de apontar para um arquivo de fora sem symlink;
// - até MAX_CONTENT_FILE_BYTES por arquivo: o fstat recusa antes de ler, e a leitura para em MAX + 1
//   bytes (um arquivo que cresce depois do fstat também é recusado). BOM inicial removido;
// - erro de JSON nunca repete o conteúdo do arquivo (o V8 ecoa o começo, que pode ser um segredo):
//   só linha e coluna, mais um texto fixo.
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { slugSchema, type Diagnostic } from "@cbjk_iris/schema";
import { ContentError, contentDiagnostic } from "./errors";

/** Limite de tamanho de cada arquivo de content/ (1 MiB). */
export const MAX_CONTENT_FILE_BYTES = 1024 * 1024;

export interface ContentContext {
  /** raiz do projeto, absoluta */
  root: string;
  /** content/ depois de resolver links (o próprio content/ pode ser um link) */
  base: string;
}

export interface ContentFile {
  slug: string;
  /** caminho lógico, dentro de root/content */
  abs: string;
  /** relativo à raiz, com "/" (vai nas mensagens) */
  rel: string;
}

export type ReadResult =
  | { status: "ok"; data: Record<string, unknown> }
  | { status: "missing" }
  | { status: "error"; diagnostics: Diagnostic[] };

const SYMLINK = "link simbólico não é aceito em content/: use um arquivo de verdade";
const NOT_FILE = "precisa ser um arquivo comum";
const HARDLINK = "arquivo com mais de um nome (hard link) não é aceito em content/: use uma cópia do arquivo";
const TOO_BIG = `arquivo maior que ${MAX_CONTENT_FILE_BYTES / 1024 / 1024} MiB: divida o conteúdo ou mova o texto longo para outro lugar`;

export function contentContext(root: string | undefined): ContentContext {
  // turbopackIgnore: no monorepo o Turbopack empacota o engine e, sem o comentário, rastreia o
  // projeto inteiro a partir do process.cwd() ("Encountered unexpected file in NFT list"). Os loaders
  // só rodam no next build (dynamicParams = false), então não há arquivo a rastrear.
  const abs = path.resolve(/* turbopackIgnore: true */ root ?? process.cwd());
  const dir = path.join(abs, "content");
  let isDir = false;
  try {
    isDir = statSync(dir).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    throw new ContentError([
      contentDiagnostic("content", `pasta content/ não encontrada em ${abs}: rode o comando na raiz do projeto`),
    ]);
  }
  return { root: abs, base: realpathSync(dir) };
}

export function relPath(ctx: ContentContext, abs: string): string {
  return path.relative(ctx.root, abs).split(path.sep).join("/");
}

function lstatOrNull(abs: string) {
  try {
    return lstatSync(abs);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Slug do nome do arquivo, ou null se o nome não for <slug>.json. */
export function slugFromFileName(name: string): string | null {
  if (!name.endsWith(".json")) return null;
  const slug = name.slice(0, -".json".length);
  return slugSchema.safeParse(slug).success ? slug : null;
}

/** Lista os <slug>.json de content/<sub>. Pasta ausente = lista vazia. */
export function listContentDir(ctx: ContentContext, sub: string): { files: ContentFile[]; diagnostics: Diagnostic[] } {
  const dir = path.join(ctx.root, "content", sub);
  const stat = lstatOrNull(dir);
  if (!stat) return { files: [], diagnostics: [] };
  const relDir = relPath(ctx, dir);
  if (stat.isSymbolicLink()) return { files: [], diagnostics: [contentDiagnostic(relDir, SYMLINK)] };
  if (!stat.isDirectory()) return { files: [], diagnostics: [contentDiagnostic(relDir, "precisa ser uma pasta")] };

  const files: ContentFile[] = [];
  const diagnostics: Diagnostic[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    const rel = relPath(ctx, abs);
    const slug = slugFromFileName(entry.name);
    if (entry.isSymbolicLink()) diagnostics.push(contentDiagnostic(rel, SYMLINK));
    else if (entry.isDirectory()) diagnostics.push(contentDiagnostic(rel, `subpasta não é aceita em ${relDir}/: um arquivo <slug>.json por item`));
    else if (!entry.isFile()) diagnostics.push(contentDiagnostic(rel, NOT_FILE));
    else if (!slug) {
      diagnostics.push(
        contentDiagnostic(rel, "nome de arquivo inválido: use <slug>.json, com letras minúsculas, números e hífens (ex.: capa-iphone-15.json), até 80 caracteres antes do .json"),
      );
    } else files.push({ slug, abs, rel });
  }
  return { files, diagnostics };
}

// Lê no máximo MAX + 1 bytes: passar disso é erro, mesmo que o arquivo tenha crescido depois do fstat.
// Exportada só para teste (test/read.test.ts); não sai no index.ts de content/.
export function readCapped(fd: number): Buffer | null {
  const buffer = Buffer.alloc(MAX_CONTENT_FILE_BYTES + 1);
  let total = 0;
  for (;;) {
    const n = readSync(fd, buffer, total, buffer.length - total, null);
    if (n === 0) break;
    total += n;
    if (total > MAX_CONTENT_FILE_BYTES) return null;
  }
  return buffer.subarray(0, total);
}

/** Exportada só para teste. */
export function readText(ctx: ContentContext, abs: string, rel: string): string | Diagnostic {
  let fd: number;
  try {
    // O_NOFOLLOW e O_NONBLOCK não existem no Windows (ficam 0); lá valem o lstat e o realpath.
    fd = openSync(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ELOOP") return contentDiagnostic(rel, SYMLINK);
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) return contentDiagnostic(rel, NOT_FILE);
    if (stat.nlink > 1) return contentDiagnostic(rel, HARDLINK);
    if (stat.size > MAX_CONTENT_FILE_BYTES) return contentDiagnostic(rel, TOO_BIG);
    const real = realpathSync(abs);
    if (!real.startsWith(ctx.base + path.sep)) return contentDiagnostic(rel, SYMLINK);
    const bytes = readCapped(fd);
    return bytes ? bytes.toString("utf8") : contentDiagnostic(rel, TOO_BIG);
  } finally {
    closeSync(fd);
  }
}

// "JSON inválido (linha 3, coluna 1): ...", sem nada do conteúdo do arquivo.
/** Exportada só para teste. */
export function jsonErrorMessage(error: unknown, text: string): string {
  const message = error instanceof Error ? error.message : "";
  const lineCol = /\(line (\d+) column (\d+)\)/.exec(message);
  const position = /at position (\d+)/.exec(message);
  let where = "";
  if (lineCol) where = ` (linha ${lineCol[1]}, coluna ${lineCol[2]})`;
  else if (position) {
    const before = text.slice(0, Number(position[1])).split("\n");
    where = ` (linha ${before.length}, coluna ${before[before.length - 1].length + 1})`;
  }
  return `JSON inválido${where}: confira vírgulas, aspas e chaves`;
}

/** Lê e interpreta um JSON de content/. Remove o $schema (os schemas são strict). */
export function readContentJson(ctx: ContentContext, abs: string): ReadResult {
  const rel = relPath(ctx, abs);
  const stat = lstatOrNull(abs);
  if (!stat) return { status: "missing" };
  if (stat.isSymbolicLink()) return { status: "error", diagnostics: [contentDiagnostic(rel, SYMLINK)] };
  // antes de abrir: o open de um FIFO bloquearia para sempre
  if (!stat.isFile()) return { status: "error", diagnostics: [contentDiagnostic(rel, NOT_FILE)] };

  const text = readText(ctx, abs, rel);
  if (typeof text !== "string") return { status: "error", diagnostics: [text] };

  const json = text.replace(/^\uFEFF/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { status: "error", diagnostics: [contentDiagnostic(rel, jsonErrorMessage(error, json))] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: "error", diagnostics: [contentDiagnostic(rel, "o arquivo precisa conter um objeto JSON ({ ... })")] };
  }

  const { $schema, ...data } = parsed as Record<string, unknown>;
  if ($schema !== undefined && typeof $schema !== "string") {
    return {
      status: "error",
      diagnostics: [contentDiagnostic(rel, "precisa ser texto: o caminho do JSON Schema (ex.: ../../node_modules/@cbjk_iris/schema/json/product.schema.json)", { path: "$schema" })],
    };
  }
  return { status: "ok", data };
}
