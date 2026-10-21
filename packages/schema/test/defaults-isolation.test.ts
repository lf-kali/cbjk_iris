import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// @cbjk_iris/schema/defaults vai para o navegador (lib/config.ts do core): não pode puxar o zod,
// nem de forma indireta (R-1 do plano da E4: o zod sozinho soma ~62 KB gzip nos chunks).

const SRC = path.resolve(__dirname, "../src");
const DIST = path.resolve(__dirname, "../dist");

// imports de valor (import type e export type não contam: somem na compilação)
function valueImports(file: string): string[] {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const specs: string[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const clause = st.importClause;
      const typeOnly =
        clause?.isTypeOnly ||
        (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.every((e) => e.isTypeOnly));
      if (!typeOnly) specs.push((st.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.isTypeOnly) {
      specs.push((st.moduleSpecifier as ts.StringLiteral).text);
    }
  }
  return specs;
}

function graph(entry: string, resolve: (from: string, spec: string) => string | null): { files: string[]; external: string[] } {
  const seen = new Set<string>();
  const external = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of valueImports(file)) {
      const next = resolve(file, spec);
      if (next) stack.push(next);
      else external.add(spec);
    }
  }
  return { files: [...seen], external: [...external] };
}

describe("@cbjk_iris/schema/defaults não importa zod", () => {
  it("no fonte: o grafo de imports de valor de src/defaults.ts não chega ao zod", () => {
    const { files, external } = graph(path.join(SRC, "defaults.ts"), (from, spec) => {
      if (!spec.startsWith(".")) return null;
      const base = path.resolve(path.dirname(from), spec);
      return [`${base}.ts`, path.join(base, "index.ts")].find(existsSync) ?? null;
    });
    expect(files.length).toBeGreaterThan(1);
    expect(external).toEqual([]);
  });

  it("no dist: dist/defaults.mjs e os chunks que ele importa não importam zod", () => {
    const entry = path.join(DIST, "defaults.mjs");
    expect(existsSync(entry), "rode antes: npm run build -w @cbjk_iris/schema").toBe(true);
    const { files, external } = graph(entry, (from, spec) => (spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null));
    expect(external).toEqual([]);
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/["']zod(\/[^"']*)?["']/);
  });
});
