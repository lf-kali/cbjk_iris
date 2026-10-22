import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { builtRouteProblems, copyDirFor, escapeRegExp, generatedRouteProblems, removeCopy, removeMenuRoutes, setModules } from "../lib/modules-check.mjs";

// Funções do npm run modules:check (scripts/check-modules.mjs): editam a cópia do site e apagam só a cópia.

let root;
beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-modules-check-root-"));
  mkdirSync(path.join(root, "apps"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("escapeRegExp", () => {
  it("escapa os metacaracteres", () => {
    const text = "a.b*c?(d)[e]{f}|g^h$i\\j+k/l";
    expect(new RegExp(`^${escapeRegExp(text)}$`).test(text)).toBe(true);
    expect(new RegExp(escapeRegExp("/produto.")).test("/produtoX")).toBe(false);
  });
});

describe("setModules", () => {
  const config = `export const siteConfig = {\n  currency: "BRL",\n  modules: ["products", "services", "gallery"],\n  menu: [],\n};\n`;

  it("troca a lista de modules", () => {
    expect(setModules(config, ["services"])).toContain(`  modules: ["services"],\n`);
    expect(setModules(config, [])).toContain(`  modules: [],\n`);
  });

  it("falha se não houver exatamente uma linha modules: [...] literal", () => {
    expect(() => setModules(`export const siteConfig = {};\n`, [])).toThrow(/modules/);
    expect(() => setModules(config + config, [])).toThrow(/modules/);
  });
});

describe("removeMenuRoutes", () => {
  it("tira só o item com o caminho exato, mesmo com caractere especial", () => {
    const config = `menu: [\n    { title: "P", path: "/produtos" },\n    { title: "X", path: "/produtos-x" },\n    { title: "Y", path: "/a.b" },\n    { title: "Z", path: "/aXb" },\n],\n`;
    const out = removeMenuRoutes(config, ["/produtos", "/a.b"]);
    expect(out).not.toContain('path: "/produtos"');
    expect(out).toContain('path: "/produtos-x"');
    expect(out).not.toContain('path: "/a.b"');
    expect(out).toContain('path: "/aXb"');
  });
});

describe("copyDirFor e removeCopy", () => {
  it("o caminho da cópia é apps/.modules-check-<cenário>", () => {
    expect(copyDirFor(root, ["products", "gallery"])).toBe(path.join(root, "apps", ".modules-check-products-gallery"));
    expect(() => copyDirFor(root, ["../x"])).toThrow(/cenário/);
    expect(() => copyDirFor(root, [])).toThrow(/cenário/);
  });

  it("apaga a cópia", () => {
    const dir = copyDirFor(root, ["gallery"]);
    mkdirSync(path.join(dir, "app"), { recursive: true });
    removeCopy(root, dir);
    expect(existsSync(dir)).toBe(false);
  });

  it("recusa apagar fora de apps/.modules-check-*", () => {
    const other = path.join(root, "apps", "site");
    mkdirSync(other);
    expect(() => removeCopy(root, other)).toThrow(/modules-check/);
    expect(() => removeCopy(root, path.join(root, "apps", ".modules-check-x", ".."))).toThrow(/modules-check/);
    expect(existsSync(other)).toBe(true);
  });

  it("cópia que virou link simbólico: apaga só o link, nunca o alvo", () => {
    const target = mkdtempSync(path.join(os.tmpdir(), "iris-modules-check-alvo-"));
    writeFileSync(path.join(target, "importante.txt"), "x");
    const dir = copyDirFor(root, ["gallery"]);
    symlinkSync(target, dir);
    expect(() => removeCopy(root, dir)).toThrow(/link simbólico/);
    expect(existsSync(path.join(target, "importante.txt"))).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });
});

describe("rotas de módulo desligado (oráculo do cenário)", () => {
  const pages = [
    { route: "", module: "core" },
    { route: "produtos", module: "products" },
    { route: "produto/[slug]", module: "products" },
    { route: "ultimos-projetos", module: "gallery" },
  ];
  const touch = (rel) => {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "x");
  };

  it("acusa rota gerada que sobrou na cópia, só dos módulos desligados", () => {
    touch("app/(iris)/page.tsx");
    touch("app/(iris)/ultimos-projetos/page.tsx");
    touch("app/(iris)/produtos/page.tsx");
    expect(generatedRouteProblems(root, pages, ["gallery"])).toEqual([
      "app/(iris)/ultimos-projetos/page.tsx ainda existe com o módulo gallery desligado",
    ]);
    expect(generatedRouteProblems(root, pages, ["products"])).toHaveLength(1);
  });

  it("acusa página construída pelo next build para rota de módulo desligado", () => {
    touch(".next/server/app/ultimos-projetos.html");
    touch(".next/server/app/produto/piso.html");
    touch(".next/server/app/index.html");
    expect(builtRouteProblems(root, pages, ["gallery"])).toEqual([
      ".next/server/app/ultimos-projetos.html foi gerado com o módulo gallery desligado",
    ]);
    expect(builtRouteProblems(root, pages, ["products"])).toEqual([
      ".next/server/app/produto foi gerado com o módulo products desligado",
    ]);
    expect(builtRouteProblems(root, pages, [])).toEqual([]);
  });
});
