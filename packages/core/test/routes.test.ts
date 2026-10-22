import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ROUTE_PAGES } from "@cbjk_iris/engine/codegen";
import { MODULES } from "@cbjk_iris/schema";

// Contrato das rotas geradas (SPEC §5.1.3, tabela ROUTE_PAGES do engine): a rota fina do projeto
// reexporta da página do core os nomes da tabela. Se a página deixar de exportar um deles, o build do
// projeto quebra; se exportar algo novo que a rota não reexporta, o Next nunca o vê.

const APP = path.resolve(__dirname, "../src/app");
// config de segmento escrita literal na rota gerada (dynamicParams), não reexportada
const SEGMENT_CONFIG = new Set(["dynamicParams"]);

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);

/** Nomes exportados de um arquivo, lidos pela AST do TypeScript ("default" para export default). */
export function exportedNames(text: string): string[] {
  const source = ts.createSourceFile("page.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names: string[] = [];
  for (const node of source.statements) {
    if (ts.isExportAssignment(node)) names.push("default");
    else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      names.push(...node.exportClause.elements.map((e) => e.name.text));
    } else if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      if (hasModifier(node, ts.SyntaxKind.DefaultKeyword)) names.push("default");
      else if (ts.isVariableStatement(node)) {
        names.push(...node.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : [])));
      } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) names.push(node.name.text);
    }
  }
  return names.sort();
}

describe("rotas geradas × páginas do core (ROUTE_PAGES)", () => {
  it.each(ROUTE_PAGES.map((p) => [p.page, p]))("app/%s exporta exatamente os nomes da tabela", (_page, entry) => {
    const file = path.join(APP, `${entry.page}.tsx`);
    expect(existsSync(file), file).toBe(true);
    const names = exportedNames(readFileSync(file, "utf8")).filter((n) => !SEGMENT_CONFIG.has(n));
    expect(names).toEqual([...entry.exports].sort());
  });

  it("as rotas dos módulos na tabela são as de MODULES, e as do núcleo são a home e [slug]", () => {
    const fromModules = MODULES.flatMap((m) => m.routes.map((r) => `${m.id}:${r}`)).sort();
    const fromTable = ROUTE_PAGES.filter((p) => p.module !== "core").map((p) => `${p.module}:${p.route}`).sort();
    expect(fromTable).toEqual(fromModules);
    expect(ROUTE_PAGES.filter((p) => p.module === "core").map((p) => p.route)).toEqual(["", "[slug]"]);
  });

  it("controle negativo: o leitor de exports enxerga cada forma de export", () => {
    const text = `export default function P() {}\nexport const metadata = {};\nexport async function generateMetadata() {}\nconst x = 1;\nexport { x as y };\nfunction z() {}`;
    expect(exportedNames(text)).toEqual(["default", "generateMetadata", "metadata", "y"]);
  });
});
