import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Regras de import do core (SPEC §5.1.3, §5.3 e spike-001):
// - imports internos relativos: "@/" resolveria para o tsconfig do projeto do cliente;
// - só lib/config.ts lê o site.config.ts do projeto;
// - o engine roda pelo Node (serverExternalPackages): arquivo "use client" não pode importá-lo.

const SRC = path.resolve(__dirname, "../src");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? sources(p) : /\.(tsx?)$/.test(e.name) ? [p] : [];
  });
}

const FILES = sources(SRC).map((file) => ({
  rel: path.relative(SRC, file).split(path.sep).join("/"),
  text: readFileSync(file, "utf8"),
}));

const SPECIFIER = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;
const specifiers = (text: string) => [...text.matchAll(SPECIFIER)].map((m) => m[1]);

describe("imports do core", () => {
  it("acha os fontes", () => {
    expect(FILES.length).toBeGreaterThan(50);
  });

  it("nenhum import usa o alias @/", () => {
    const offenders = FILES.filter((f) => specifiers(f.text).some((s) => s.startsWith("@/"))).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("só lib/config.ts importa @cbjk_iris/site-config", () => {
    const readers = FILES.filter((f) => specifiers(f.text).includes("@cbjk_iris/site-config")).map((f) => f.rel);
    expect(readers).toEqual(["lib/config.ts"]);
  });

  it('nenhum arquivo "use client" importa @cbjk_iris/engine', () => {
    const offenders = FILES.filter(
      (f) =>
        /^\s*["']use client["']/.test(f.text) &&
        specifiers(f.text).some((s) => s === "@cbjk_iris/engine" || s.startsWith("@cbjk_iris/engine/")),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("o core não importa a si mesmo por @cbjk_iris/core (fura o isolamento dos módulos)", () => {
    const offenders = FILES.filter((f) =>
      specifiers(f.text).some((s) => s === "@cbjk_iris/core" || s.startsWith("@cbjk_iris/core/")),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("o core não importa a CLI", () => {
    const offenders = FILES.filter((f) =>
      specifiers(f.text).some((s) => s === "@cbjk_iris/cli" || s.startsWith("@cbjk_iris/cli/") || s === "create-iris-site"),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});

// R-1 (E4/E5): o que um arquivo "use client" alcança vai para o navegador. Seguindo os imports relativos
// a partir de cada arquivo cliente, nenhum arquivo do grafo pode importar (com valor, não "import type")
// o engine (fs, zod), o @cbjk_iris/schema raiz (zod: use @cbjk_iris/schema/defaults), zod ou módulos do Node.
type Source = { rel: string; text: string };

const SERVER_ONLY = [/^@cbjk_iris\/engine(\/|$)/, /^@cbjk_iris\/schema$/, /^zod(\/|$)/, /^node:/, /^(fs|path|os|child_process)$/];

function valueImports(text: string): string[] {
  const file = ts.createSourceFile("x.tsx", text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const out: string[] = [];
  for (const st of file.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const clause = st.importClause;
      const named = clause?.namedBindings;
      const allTypes =
        !!clause &&
        (clause.isTypeOnly ||
          (!clause.name && !!named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)));
      if (!allTypes) out.push(st.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) && !st.isTypeOnly) {
      out.push(st.moduleSpecifier.text);
    }
  }
  return out;
}

function resolveRel(files: Map<string, Source>, from: string, spec: string): string | undefined {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((c) => files.has(c));
}

export function clientGraphOffenders(sources: Source[]): string[] {
  const files = new Map(sources.map((s) => [s.rel, s]));
  const offenders = new Set<string>();
  for (const start of sources.filter((s) => /^\s*["']use client["']/.test(s.text))) {
    const seen = new Set<string>();
    const queue = [start.rel];
    while (queue.length) {
      const rel = queue.pop()!;
      if (seen.has(rel)) continue;
      seen.add(rel);
      for (const spec of valueImports(files.get(rel)!.text)) {
        if (SERVER_ONLY.some((re) => re.test(spec))) offenders.add(`${start.rel} → ${rel} importa ${spec}`);
        const next = spec.startsWith(".") ? resolveRel(files, rel, spec) : undefined;
        if (next) queue.push(next);
      }
    }
  }
  return [...offenders].sort();
}

describe("grafo dos arquivos \"use client\" (R-1)", () => {
  it("nenhum arquivo alcançado por um componente cliente importa engine, schema raiz, zod ou Node", () => {
    expect(clientGraphOffenders(FILES)).toEqual([]);
  });

  it("controle negativo: import indireto do engine, do schema raiz e de node:fs é apontado; import type não", () => {
    const fake: Source[] = [
      { rel: "a.tsx", text: '"use client";\nimport { b } from "./b";\nimport type { Product } from "@cbjk_iris/schema";' },
      { rel: "b.ts", text: 'import { loadProducts } from "@cbjk_iris/engine/content";\nexport { c } from "./c";' },
      { rel: "c/index.ts", text: 'import { productSchema } from "@cbjk_iris/schema";\nimport fs from "node:fs";' },
      { rel: "d.ts", text: 'import { loadHome } from "@cbjk_iris/engine/content";' },
    ];
    expect(clientGraphOffenders(fake)).toEqual([
      "a.tsx → b.ts importa @cbjk_iris/engine/content",
      "a.tsx → c/index.ts importa @cbjk_iris/schema",
      "a.tsx → c/index.ts importa node:fs",
    ]);
  });
});
