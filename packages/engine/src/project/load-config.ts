// LoadSiteConfig (SPEC §5.6): lê o site.config.ts do projeto pelo Node (type stripping) e valida.
//
// Por que um processo filho a cada chamada (P-1 = A, dono em 2026-10-22): o Node guarda em cache o
// módulo importado, e nem o import() nem o require() releem o arquivo editado no mesmo processo
// (delete require.cache não adianta para ESM). A CLI edita o config e roda o sync em seguida; com
// cache, o sync usaria o config velho. O filho importa o arquivo do zero, confere que o valor é só
// dados e devolve JSON pelo descritor 3 (o stdout fica livre para o console.log do próprio config).
//
// O config é código do projeto: executá-lo é o mesmo que o next build já faz com o next.config.ts.
// O filho tem tempo (30 s) e saída (4 MiB por canal, maxBuffer do spawnSync) limitados.
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { resolveSiteConfig, type Diagnostic, type SiteConfig, type SiteConfigInput } from "@cbjk_iris/schema";
import { CONFIG_FILE, SiteConfigLoadError } from "./errors";

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_MESSAGE = 200;

// Código do filho (ESM, sem dependências). argv[1] = caminho absoluto do site.config.ts.
const CHILD = `
import { writeSync } from "node:fs";
import { pathToFileURL } from "node:url";
function send(obj) {
  const buf = Buffer.from(JSON.stringify(obj));
  let off = 0;
  while (off < buf.length) {
    try { off += writeSync(3, buf, off); } catch (e) { if (e.code !== "EAGAIN") throw e; }
  }
}
function nonData(value, path, seen) {
  const t = typeof value;
  if (t === "function" || t === "symbol" || t === "bigint") return path;
  if (t === "number" && !Number.isFinite(value)) return path;
  if (value === null || t !== "object") return null;
  if (seen.has(value)) return path;
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return path;
  seen.add(value);
  for (const [k, v] of Object.entries(value)) {
    const sub = Array.isArray(value) ? path + "[" + k + "]" : path ? path + "." + k : k;
    const bad = nonData(v, sub, seen);
    if (bad !== null) return bad;
  }
  seen.delete(value);
  return null;
}
let mod;
try {
  mod = await import(pathToFileURL(process.argv[1]).href);
} catch (e) {
  send({ kind: "import", code: e && e.code ? String(e.code) : null, message: String(e && e.message ? e.message : e).split("\\n")[0] });
  process.exit(0);
}
if (!Object.hasOwn(mod, "siteConfig")) { send({ kind: "no-export" }); process.exit(0); }
const bad = nonData(mod.siteConfig, "", new Set());
if (bad !== null) { send({ kind: "not-data", path: bad }); process.exit(0); }
send({ kind: "ok", config: mod.siteConfig });
process.exit(0);
`;

type ChildMessage =
  | { kind: "ok"; config: unknown }
  | { kind: "import"; code: string | null; message: string }
  | { kind: "no-export" }
  | { kind: "not-data"; path: string };

// Texto que vem do processo filho (mensagem de erro, stderr) é do projeto: sequências ANSI e
// caracteres de controle sairiam crus no terminal de quem roda a CLI (limpar a tela, mudar o título).
const ANSI = /\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?)/g;
// também os invisíveis que reordenam ou quebram a linha no terminal: marcas de direção (U+200E, U+200F),
// embutir/sobrepor direção (U+202A a U+202E), isolar direção (U+2066 a U+2069) e separadores U+2028/U+2029
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\u2028\u2029]/g;

export function stripControl(text: string): string {
  return text.replace(ANSI, "").replace(CONTROL, "");
}

function truncate(text: string): string {
  return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}…` : text;
}

function fail(message: string, extra: Partial<Diagnostic> = {}): never {
  throw new SiteConfigLoadError([{ level: "error", file: CONFIG_FILE, ...extra, message: truncate(stripControl(message)) }]);
}

function importMessage(msg: { code: string | null; message: string }): string {
  if (msg.code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") {
    return `usa sintaxe TypeScript que o Node não apaga (enum, namespace, parameter properties): use só tipos e "import type" (${msg.message})`;
  }
  return `erro ao executar o arquivo: ${msg.message}`;
}

function lastLines(text: string | undefined): string {
  return (text ?? "").trim().split("\n").slice(-3).join(" ");
}

function runChild(root: string, file: string): ChildMessage {
  // turbopackIgnore: este arquivo não entra no build do Next (só a CLI e os scripts o chamam), mas o
  // comentário evita que um empacotamento acidental rastreie o projeto inteiro.
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", CHILD, file], {
    cwd: path.resolve(/* turbopackIgnore: true */ root),
    stdio: ["ignore", "pipe", "pipe", "pipe"],
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: MAX_OUTPUT_BYTES,
    windowsHide: true,
  });
  const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ETIMEDOUT") fail(`o arquivo levou mais de ${TIMEOUT_MS / 1000} s para carregar`);
  if (code === "ENOBUFS") fail("o arquivo produziu saída demais ao carregar");
  if (result.error) fail(`não consegui iniciar o Node para ler o arquivo: ${result.error.message}`);
  const out = (result.output[3] as string | null) ?? "";
  try {
    return JSON.parse(out) as ChildMessage;
  } catch {
    return fail(`o Node encerrou sem ler o arquivo: ${lastLines(result.stderr) || `código ${result.status}`}`);
  }
}

/** Valor cru do site.config.ts (antes de validar). Lança SiteConfigLoadError. */
export function readRawSiteConfig(root: string): unknown {
  const abs = path.resolve(/* turbopackIgnore: true */ root);
  const file = path.join(abs, CONFIG_FILE);
  let isFile = false;
  try {
    isFile = statSync(file).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) fail(`${CONFIG_FILE} não encontrado em ${abs}: rode o comando na raiz do projeto`);

  const msg = runChild(abs, file);
  switch (msg.kind) {
    case "ok":
      return msg.config;
    case "import":
      return fail(importMessage(msg));
    case "no-export":
      return fail('o arquivo precisa ter "export const siteConfig = { ... }"');
    case "not-data":
      return fail(
        "o config precisa ser só dados (texto, número, booleano, lista e objeto): função, classe, Date, Map e referência circular não são aceitos",
        msg.path ? { path: truncate(stripControl(msg.path)) } : {},
      );
  }
}

/** Versão síncrona, usada pelo sync e pelo check. Lança SiteConfigLoadError ou SiteConfigError. */
export function loadSiteConfigSync(root: string): SiteConfig {
  return resolveSiteConfig(readRawSiteConfig(root) as SiteConfigInput);
}

/** LoadSiteConfig (SPEC §5.6). */
export async function loadSiteConfig(root: string): Promise<SiteConfig> {
  return loadSiteConfigSync(root);
}
