#!/usr/bin/env node
// Inventário das classes de forma fixas do core (SPEC §5.4, passos 1 a 3). Dono: iris-architect.
//
//   node scripts/style-inventory.mjs            lista cada ocorrência (arquivo:linha, classe, destino)
//   node scripts/style-inventory.mjs --check    sai com 0 só se toda ocorrência tiver destino e nenhuma entrada estiver obsoleta
//   node scripts/style-inventory.mjs --after    idem, e só se sobrarem apenas exceções (teste do iris-theme)
//
// Opções: --src <dir> (padrão packages/core/src), --inventory <json> (padrão docs/spec/style-inventory.json).
//
// O script lê toda string do código (atributo de JSX, argumento do cn(), base e variantes do cva,
// valores de objeto, partes de template literal) com o parser do TypeScript, e não só o className.
// Comentários, texto de JSX e strings que não são lista de classes (ver notClassList) não contam.
// Em .css, lê as classes do @apply.
// Não contam: os utilitários congelados (lista "utilities" do JSON) e classes sob variante style-<id>,
// que é o mecanismo permitido pelo §5.4.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CODE_EXT = /\.(?:tsx?|jsx?|mjs|cjs|mts|cts)$/;
// comprimento arbitrário, ex.: [3px], [0.5rem]
const LEN = String.raw`\[[\d.]+[a-z%]*\]`;

// Famílias de classe de forma (SPEC §5.4, passo 1). A classificação por contexto
// ("em controles", "em superfícies") fica no JSON, não aqui: o script lista tudo.
export const FAMILIES = {
  rounded: /^rounded(?:-.+)?$/,
  shadow: /^shadow(?:-.+)?$/,
  blur: /^(?:backdrop-)?blur(?:-.+)?$/,
  ring: new RegExp(String.raw`^(?:inset-)?ring(?:-offset)?(?:-(?:\d+|${LEN}))?$|^ring-[a-z][\w-]*\/(?:\d+|\[[^\]]+\])$`),
  border: new RegExp(String.raw`^border(?:-[xytrblse])?(?:-(?:\d+|${LEN}))?$`),
  // "outline" sem número também conta (outline-style sólido com 1px); o nome de variante
  // "outline" é descartado pelo contexto em notClassList
  outline: new RegExp(String.raw`^outline(?:-offset)?(?:-(?:\d+|${LEN}))?$|^outline-[a-z][\w-]*\/(?:\d+|\[[^\]]+\])$`),
  // divide-x/divide-y desenham borda entre filhos (largura 1px sem número)
  divide: new RegExp(String.raw`^divide-[xy](?:-(?:\d+|${LEN}|reverse))?$|^divide-[a-z][\w-]*\/(?:\d+|\[[^\]]+\])$`),
  case: /^(?:uppercase|lowercase|capitalize|normal-case)$/,
  tracking: /^tracking-.+$/,
  weight: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/,
  "bg-alpha": /^bg-.+\/(?:\d+|\[[^\]]+\])$/,
};

// separa "hover:data-[a=b]:rounded-none" em variantes e base, respeitando colchetes e parênteses
export function splitVariants(token) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of token) {
    if (ch === "[" || ch === "(") depth++;
    if (ch === "]" || ch === ")") depth--;
    if (ch === ":" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  return { variants: parts, base: cur };
}

// null quando a classe não é de forma, é um utilitário congelado ou está sob style-<id>
export function classify(token, utilities) {
  const { variants, base: raw } = splitVariants(token);
  if (variants.some((v) => /^style-[a-z0-9-]+$/.test(v))) return null;
  const base = raw.replace(/^!|!$/g, "").replace(/^-/, "");
  if (utilities.includes(base)) return null;
  const family = Object.keys(FAMILIES).find((name) => FAMILIES[name].test(base));
  return family ? { family, base, variants } : null;
}

// Strings que com certeza não são lista de classes, mesmo contendo uma palavra igual a uma classe
// (ex.: o nome de variante "outline" em variant="outline"):
// - tipo literal (type V = "outline");
// - valor de atributo JSX cujo nome não contém "class" (variant, aria-label, alt...): vale o
//   atributo JSX mais próximo, então <X render={<div className="..."/>}/> continua lido;
// - valor das chaves variant e size (seletores do cva, ex.: button({ variant: "outline" }));
// - operando de comparação (=== / !==) e rótulo de case.
function notClassList(node) {
  const SK = ts.SyntaxKind;
  const parent = node.parent;
  if (parent.kind === SK.LiteralType || parent.kind === SK.CaseClause) return true;
  if (parent.kind === SK.BinaryExpression) {
    const op = parent.operatorToken.kind;
    if ([SK.EqualsEqualsEqualsToken, SK.ExclamationEqualsEqualsToken, SK.EqualsEqualsToken, SK.ExclamationEqualsToken].includes(op)) return true;
  }
  if (parent.kind === SK.PropertyAssignment && parent.initializer === node && /^(?:variant|size)$/.test(parent.name.getText())) return true;
  for (let p = parent; p && p.kind !== SK.SourceFile; p = p.parent) {
    if (p.kind === SK.JsxAttribute) return !/class/i.test(p.name.getText());
  }
  return false;
}

// trechos de string do código, com a posição do primeiro caractere no arquivo
function stringPieces(text, file) {
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const pieces = [];
  const SK = ts.SyntaxKind;
  // quantos caracteres cortar no fim: aspas/crase (1) ou "${" (2)
  const tail = { [SK.StringLiteral]: 1, [SK.NoSubstitutionTemplateLiteral]: 1, [SK.TemplateHead]: 2, [SK.TemplateMiddle]: 2, [SK.TemplateTail]: 1 };
  const visit = (node) => {
    if (node.kind in tail && !notClassList(node)) {
      const start = node.getStart(sf) + 1;
      pieces.push({ start, raw: text.slice(start, node.end - tail[node.kind]) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return pieces;
}

// classes depois de cada @apply de um .css
function cssPieces(text) {
  return [...text.matchAll(/@apply\s+([^;}]+)/g)].map((m) => ({ start: m.index + m[0].indexOf(m[1]), raw: m[1] }));
}

// lista as ocorrências de um arquivo: { file, line, class, base, family, lineText }
export function scanSource(text, file, utilities) {
  const lineStarts = [0, ...[...text.matchAll(/\n/g)].map((m) => m.index + 1)];
  const lineOf = (pos) => lineStarts.findLastIndex((s) => s <= pos) + 1;
  const lines = text.split("\n");
  const pieces = file.endsWith(".css") ? cssPieces(text) : stringPieces(text, file);
  return pieces.flatMap(({ start, raw }) =>
    [...raw.matchAll(/\S+/g)].flatMap((m) => {
      const hit = classify(m[0], utilities);
      if (!hit) return [];
      const line = lineOf(start + m.index);
      return [{ file, line, class: m[0], base: hit.base, family: hit.family, lineText: lines[line - 1] }];
    }),
  );
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
    return CODE_EXT.test(e.name) || e.name.endsWith(".css") ? [p] : [];
  });
}

export function scanDir(root, utilities) {
  return walk(root)
    .map((abs) => path.relative(root, abs).split(path.sep).join("/"))
    .sort()
    .flatMap((rel) => scanSource(readFileSync(path.join(root, rel), "utf8"), rel, utilities));
}

// confere as entradas do JSON: campos e destino conhecido
function entryErrors(inventory) {
  const utils = new Set(inventory.utilities);
  return inventory.occurrences.flatMap((e, i) => {
    const where = `occurrences[${i}] (${e.file} ${e.class})`;
    const errs = [];
    if (!e.file || !e.class) errs.push(`${where}: falta file ou class`);
    if (!Number.isInteger(e.count) || e.count < 1) errs.push(`${where}: count deve ser inteiro >= 1`);
    const exc = /^exception:(.+)$/.exec(e.to ?? "");
    const known = exc ? Object.hasOwn(inventory.exceptions, exc[1]) : utils.has(e.to);
    if (!known) errs.push(`${where}: destino desconhecido "${e.to}" (nem utilitário congelado nem exceção)`);
    return errs;
  });
}

// casa cada ocorrência com uma entrada (mesmo arquivo e classe; "near" desempata pelo texto da linha)
function matchEntry(occ, entries) {
  const same = entries.filter((e) => e.file === occ.file && e.class === occ.class);
  const near = same.filter((e) => e.near && occ.lineText.includes(e.near));
  const pool = near.length > 0 ? near : same.filter((e) => !e.near);
  return pool;
}

export function evaluate(occurrences, inventory) {
  const errors = entryErrors(inventory);
  const used = new Map(inventory.occurrences.map((e) => [e, 0]));
  const missing = [];
  const resolved = [];
  for (const occ of occurrences) {
    const pool = matchEntry(occ, inventory.occurrences);
    if (pool.length > 1) {
      errors.push(`${occ.file}:${occ.line} ${occ.class}: entrada ambígua (${pool.length} entradas casam; use "near")`);
      continue;
    }
    const entry = pool[0];
    if (!entry || used.get(entry) >= entry.count) {
      missing.push(occ);
      continue;
    }
    used.set(entry, used.get(entry) + 1);
    resolved.push({ ...occ, to: entry.to });
  }
  const stale = inventory.occurrences.filter((e) => used.get(e) < e.count).map((e) => ({ ...e, found: used.get(e) }));
  const pending = resolved.filter((o) => !o.to.startsWith("exception:"));
  return { errors, missing, resolved, pending, stale };
}

function parseArgs(argv) {
  const opts = { mode: "list", src: null, inventory: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check" || a === "--after") {
      if (opts.mode !== "list") return { error: "use só um modo: --check ou --after" };
      opts.mode = a.slice(2);
    } else if (a === "--src" || a === "--inventory") {
      if (!argv[i + 1]) return { error: `${a} precisa de um caminho` };
      opts[a.slice(2)] = argv[++i];
    } else return { error: `opção desconhecida: ${a}` };
  }
  return opts;
}

function row(o, to) {
  return `${o.file}:${o.line}  ${o.class.padEnd(40)}  → ${to}`;
}

function report(r, mode, log) {
  const shown = mode === "list" ? r.resolved : mode === "after" ? r.pending : [];
  for (const o of shown) log(row(o, o.to));
  for (const o of r.missing) log(row(o, "SEM DESTINO"));
  for (const e of r.errors) log(`ERRO: ${e}`);
  for (const s of r.stale) log(`OBSOLETA: ${s.file} ${s.class}${s.near ? ` (near "${s.near}")` : ""}: esperado ${s.count}, achado ${s.found} (atualize o JSON)`);
  const byDest = Object.groupBy(r.resolved, (o) => o.to);
  const summary = Object.entries(byDest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([to, list]) => `  ${String(list.length).padStart(3)}  ${to}`);
  log(`\n${r.resolved.length + r.missing.length} ocorrências; ${r.missing.length} sem destino; ${r.pending.length} a trocar pelo iris-theme; ${r.resolved.length - r.pending.length} exceções`);
  log(summary.join("\n"));
}

export function main(argv, { cwd = REPO, log = console.log } = {}) {
  const opts = parseArgs(argv);
  if (opts.error) {
    log(`style-inventory: ${opts.error}`);
    return 2;
  }
  const src = path.resolve(cwd, opts.src ?? "packages/core/src");
  const invPath = path.resolve(cwd, opts.inventory ?? "docs/spec/style-inventory.json");
  let inventory;
  try {
    inventory = JSON.parse(readFileSync(invPath, "utf8"));
  } catch (error) {
    log(`style-inventory: não consegui ler ${invPath}: ${error.message}`);
    return 2;
  }
  const r = evaluate(scanDir(src, inventory.utilities), inventory);
  report(r, opts.mode, log);
  if (opts.mode === "list") return 0;
  // entrada obsoleta também falha: quem troca ou apaga uma classe atualiza o JSON no mesmo PR
  const failed = r.errors.length > 0 || r.missing.length > 0 || r.stale.length > 0 || (opts.mode === "after" && r.pending.length > 0);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
