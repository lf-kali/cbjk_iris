import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
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
