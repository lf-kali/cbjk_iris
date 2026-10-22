import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productCatalog } from "../src/catalog/products";
import { serviceCatalog } from "../src/catalog/services";

// Os repositórios do core leem content/ pelos loaders do engine (SPEC §5.3), a partir de process.cwd().
// A interface (ProductRepository, ServiceRepository) não muda.
let root: string;

const product = (name: string, category: string, order?: number) => ({ name, category, price: 1, images: ["/p.jpg"], shortDescription: "x", description: "x", stockQty: 0, ...(order === undefined ? {} : { order }) });
const service = (name: string, order: number) => ({ name, images: ["/s.jpg"], shortDescription: "x", description: "x", order });

function write(rel: string, data: unknown) {
  const file = path.join(root, "content", rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
}

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-core-catalog-"));
  write("products/capa.json", product("Capa", "Capas", 10));
  write("products/pelicula.json", product("Película", "Telas", 20));
  write("products/cabo.json", product("Cabo", " capas ", 30));
  write("products/fone.json", product("Fone", "Áudio"));
  write("services/tela.json", service("Tela", 20));
  write("services/bateria.json", service("Bateria", 10));
  vi.spyOn(process, "cwd").mockReturnValue(root);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("productCatalog", () => {
  it("lista na ordem do content (order, sem order no fim)", async () => {
    expect((await productCatalog.list()).map((p) => p.slug)).toEqual(["capa", "pelicula", "cabo", "fone"]);
  });

  it("filtra por categoria (sem diferenciar caixa e espaços), excludeSlug e limit", async () => {
    expect((await productCatalog.list({ category: "CAPAS" })).map((p) => p.slug)).toEqual(["capa", "cabo"]);
    expect((await productCatalog.list({ excludeSlug: "capa", limit: 2 })).map((p) => p.slug)).toEqual(["pelicula", "cabo"]);
  });

  it("get e categories", async () => {
    expect((await productCatalog.get("pelicula"))?.name).toBe("Película");
    expect(await productCatalog.get("../capa")).toBeUndefined();
    expect(await productCatalog.categories()).toEqual(["Capas", "Telas", " capas ", "Áudio"]);
  });
});

describe("serviceCatalog", () => {
  it("lista ordenado e get", async () => {
    expect((await serviceCatalog.list()).map((s) => s.slug)).toEqual(["bateria", "tela"]);
    expect((await serviceCatalog.get("tela"))?.kind).toBe("service");
    expect(await serviceCatalog.get("nada")).toBeUndefined();
  });
});
