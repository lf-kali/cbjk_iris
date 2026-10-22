import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkContent } from "../src/content/check";
import { cleanupProjects, makeProject, writeFile } from "./helpers/project";
import type { siteConfigFixture } from "./fixtures/site-config";

// CheckContent (SPEC §5.6): config + todo o content/, sem lançar e sem escrever. É o "iris check".

afterEach(cleanupProjects);

const product = {
  $schema: "../../x.json",
  name: "Capa",
  category: "Capas",
  price: 10,
  images: ["/products/capa.jpg"],
  shortDescription: "Capa de silicone.",
  description: "Capa de silicone para celular.",
  stockQty: 1,
};
const errors = <T extends { level: string }>(list: T[]) => list.filter((d) => d.level === "error");

function project(config: Parameters<typeof siteConfigFixture>[0] = {}, files: Record<string, unknown> = {}) {
  const root = makeProject(config);
  mkdirSync(path.join(root, "content"));
  for (const [rel, data] of Object.entries(files)) writeFile(root, rel, typeof data === "string" ? data : JSON.stringify(data));
  return root;
}

describe("checkContent", () => {
  it("projeto válido: nenhum diagnóstico", () => {
    const root = project({}, {
      "content/home.json": { sections: [{ type: "faq", items: [{ question: "P?", answer: "R" }] }] },
      "content/products/capa.json": product,
    });
    expect(checkContent(root)).toEqual([]);
  });

  it("junta os erros de todos os arquivos, sem lançar", () => {
    const root = project({}, {
      "content/home.json": "{ quebrado",
      "content/products/capa.json": { ...product, price: "dez" },
      "content/services/x.json": { name: 1 },
      "content/pages/sobre.json": { title: "Sobre", sections: [{ type: "nao-existe" }] },
    });
    const files = errors(checkContent(root)).map((d) => d.file);
    expect(new Set(files)).toEqual(
      new Set(["content/home.json", "content/products/capa.json", "content/services/x.json", "content/pages/sobre.json"]),
    );
  });

  it("seção de módulo desligado: erro com hint", () => {
    const root = project({ modules: ["products"] }, { "content/home.json": { sections: [{ type: "gallery" }] } });
    expect(checkContent(root)).toContainEqual(
      expect.objectContaining({ level: "error", file: "content/home.json", path: "sections[0]", hint: "iris module add gallery" }),
    );
  });

  it("pasta de conteúdo de módulo desligado: aviso", () => {
    const root = project({ modules: [] }, { "content/products/capa.json": product });
    expect(checkContent(root)).toEqual([
      expect.objectContaining({ level: "warning", file: "content/products", hint: "iris module add products" }),
    ]);
  });

  it("galeria desligada com fotos em public/: o aviso diz que os arquivos continuam acessíveis pela URL", () => {
    const root = project({ modules: ["products", "services"] }, { "public/ultimos_projetos/a.jpg": "x" });
    expect(checkContent(root)).toEqual([
      expect.objectContaining({ level: "warning", file: "public/ultimos_projetos", message: expect.stringMatching(/continuam acessíveis pela URL/) }),
    ]);
  });

  it("config inválido: diagnósticos do site.config.ts, e o conteúdo ainda é conferido", () => {
    const root = project({ images: { remoteHosts: ["**"] } }, { "content/products/capa.json": { ...product, price: "dez" } });
    const list = checkContent(root);
    expect(list).toContainEqual(expect.objectContaining({ file: "site.config.ts", path: "images.remoteHosts[0]" }));
    expect(list).toContainEqual(expect.objectContaining({ file: "content/products/capa.json", path: "price" }));
  });

  it("config que não carrega: diagnóstico, sem lançar", () => {
    const root = project();
    writeFile(root, "site.config.ts", "enum E { A }\nexport const siteConfig = {};\n");
    expect(errors(checkContent(root))[0]).toMatchObject({ file: "site.config.ts" });
  });

  it("sem content/: diagnóstico claro, sem lançar", () => {
    const root = project();
    rmSync(path.join(root, "content"), { recursive: true });
    expect(checkContent(root)).toEqual([expect.objectContaining({ level: "error", file: "content" })]);
  });

  it("não escreve nada", () => {
    const root = project({}, { "content/home.json": { sections: [{ type: "gallery" }] } });
    const before = readdirSync(root, { recursive: true }).sort();
    const home = readFileSync(path.join(root, "content/home.json"), "utf8");
    checkContent(root);
    expect(readdirSync(root, { recursive: true }).sort()).toEqual(before);
    expect(readFileSync(path.join(root, "content/home.json"), "utf8")).toBe(home);
  });
});
