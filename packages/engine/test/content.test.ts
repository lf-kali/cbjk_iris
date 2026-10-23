import { execFileSync, spawnSync } from "node:child_process";
import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODULES } from "@cbjk_iris/schema";
import {
  ContentError,
  MAX_CONTENT_FILE_BYTES,
  loadHome,
  loadPage,
  loadPages,
  loadProducts,
  loadServices,
} from "../src/content";

// Loaders de content/ (SPEC §5.3): cada caso roda numa pasta temporária que faz o papel da raiz do projeto.

let root: string;
const ALL = { modules: DEFAULT_MODULES };

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-content-"));
  mkdirSync(path.join(root, "content"));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, data: unknown) {
  const file = path.join(root, "content", rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2));
  return file;
}

const product = (extra: Record<string, unknown> = {}) => ({
  $schema: "../../node_modules/@cbjk_iris/schema/json/product.schema.json",
  name: "Capa",
  category: "Capas",
  price: 10,
  images: ["/products/capa.jpg"],
  shortDescription: "Capa de silicone.",
  description: "Capa de silicone para celular.",
  stockQty: 1,
  ...extra,
});

const service = (extra: Record<string, unknown> = {}) => ({
  name: "Troca de tela",
  images: ["/services/tela.jpg"],
  shortDescription: "Troca de tela.",
  description: "Troca de tela com garantia.",
  ...extra,
});

const faq = { type: "faq", items: [{ question: "Prazo?", answer: "2 dias" }] };
const page = (extra: Record<string, unknown> = {}) => ({ title: "Sobre", sections: [faq], ...extra });

async function contentError(promise: Promise<unknown>): Promise<ContentError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return error as ContentError;
  }
  throw new Error("esperava ContentError, mas o loader não lançou erro");
}

describe("loadProducts e loadServices", () => {
  it("lê cada <slug>.json, remove o $schema, valida, põe slug e kind e aplica os padrões", async () => {
    write("products/capa-iphone.json", product());
    const [p] = await loadProducts({ root });
    expect(p).toMatchObject({ kind: "product", slug: "capa-iphone", name: "Capa", whatsappButton: true });
    expect(p).not.toHaveProperty("$schema");
  });

  it("aceita o $schema, mas ele precisa ser texto", async () => {
    write("products/a.json", product());
    await expect(loadProducts({ root })).resolves.toHaveLength(1);
    write("products/a.json", product({ $schema: 1 }));
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("content/products/a.json → $schema:");
  });

  it("ordena por order crescente, sem order no fim, empate pelo slug", async () => {
    write("products/c.json", product());
    write("products/b.json", product({ order: 10 }));
    write("products/a.json", product({ order: 10 }));
    write("products/d.json", product({ order: 5 }));
    write("products/e.json", product());
    expect((await loadProducts({ root })).map((p) => p.slug)).toEqual(["d", "a", "b", "c", "e"]);
  });

  it("serviços: mesmo formato, kind service", async () => {
    write("services/tela.json", service({ order: 20 }));
    write("services/bateria.json", service({ order: 10 }));
    const list = await loadServices({ root });
    expect(list.map((s) => [s.kind, s.slug])).toEqual([["service", "bateria"], ["service", "tela"]]);
  });

  it("pasta ausente = lista vazia; dotfiles (.gitkeep) são ignorados", async () => {
    await expect(loadProducts({ root })).resolves.toEqual([]);
    write("services/.gitkeep", "");
    write("services/.DS_Store", "lixo");
    await expect(loadServices({ root })).resolves.toEqual([]);
  });

  it("content/ ausente é erro, para não montar um site vazio com o cwd errado", async () => {
    rmSync(path.join(root, "content"), { recursive: true });
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("pasta content/ não encontrada");
  });

  it.each(["Capa.json", "capa_x.json", "capa.JSON", "capa.json~", "capa..json", "-capa.json", "README.md"])(
    "nome fora do padrão <slug>.json é erro: %s",
    async (name) => {
      write(`products/${name}`, product());
      const err = await contentError(loadProducts({ root }));
      expect(err.diagnostics[0].file).toBe(`content/products/${name}`);
      expect(err.message).toContain("nome de arquivo");
    },
  );

  it("slug com mais de 80 caracteres é erro", async () => {
    write(`products/${"a".repeat(81)}.json`, product());
    await contentError(loadProducts({ root }));
  });

  it("subpasta dentro de content/products é erro", async () => {
    write("products/sub/a.json", product());
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics[0].file).toBe("content/products/sub");
  });

  it("JSON malformado: erro com o arquivo", async () => {
    write("products/a.json", "{ \"name\": ");
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toMatch(/^content\/ tem erros:\ncontent\/products\/a\.json: JSON inválido: /);
  });

  it("aceita BOM no começo do arquivo (Bloco de Notas)", async () => {
    write("products/a.json", "﻿" + JSON.stringify(product()));
    await expect(loadProducts({ root })).resolves.toHaveLength(1);
  });

  it("a raiz do JSON precisa ser um objeto", async () => {
    write("products/a.json", "[]");
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("content/products/a.json: o arquivo precisa conter um objeto JSON");
  });

  it("arquivo maior que o limite é erro, sem ler o conteúdo", async () => {
    write("products/a.json", " ".repeat(MAX_CONTENT_FILE_BYTES + 1));
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("maior que");
  });

  it("kind, slug e chave desconhecida dentro do JSON são erro (schema strict)", async () => {
    write("products/a.json", product({ kind: "product" }));
    write("products/b.json", product({ slug: "b" }));
    write("products/c.json", product({ preco: 1 }));
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics.map((d) => d.file)).toEqual([
      "content/products/a.json",
      "content/products/b.json",
      "content/products/c.json",
    ]);
  });

  it("__proto__ no JSON é chave desconhecida e não polui o protótipo", async () => {
    write("products/a.json", `{"__proto__": {"polluted": true}, "name": "x"}`);
    await contentError(loadProducts({ root }));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("junta os erros de todos os arquivos numa mensagem só, com caminho e mensagem em pt-BR", async () => {
    write("products/a.json", product({ price: "dez" }));
    write("products/b.json", product({ images: [] }));
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics).toHaveLength(2);
    expect(err.diagnostics[0]).toMatchObject({ level: "error", file: "content/products/a.json", path: "price" });
    expect(err.message).toContain("content/products/a.json → price: ");
    expect(err.message).toContain("content/products/b.json → images: ");
    expect(err.diagnostics[0].message).toMatch(/^Entrada inválida: esperava/);
  });

  it("symlink é recusado sem ler o alvo (arquivo e pasta)", async () => {
    const secret = path.join(root, "segredo.txt");
    writeFileSync(secret, "SENHA-SUPER-SECRETA");
    mkdirSync(path.join(root, "content/products"));
    symlinkSync(secret, path.join(root, "content/products/a.json"));
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("link simbólico");
    expect(err.message).not.toContain("SENHA");

    rmSync(path.join(root, "content/products"), { recursive: true });
    const outside = path.join(root, "fora");
    mkdirSync(outside);
    writeFileSync(path.join(outside, "a.json"), JSON.stringify(product()));
    symlinkSync(outside, path.join(root, "content/products"));
    const err2 = await contentError(loadProducts({ root }));
    expect(err2.message).toContain("link simbólico");
  });

  it("content/ em si pode ser um link simbólico (vira a base)", async () => {
    const real = path.join(root, "real-content");
    mkdirSync(path.join(real, "products"), { recursive: true });
    writeFileSync(path.join(real, "products/a.json"), JSON.stringify(product()));
    rmSync(path.join(root, "content"), { recursive: true });
    symlinkSync(real, path.join(root, "content"));
    await expect(loadProducts({ root })).resolves.toHaveLength(1);
  });

  it("sem root, lê a partir de process.cwd()", async () => {
    write("products/a.json", product());
    vi.spyOn(process, "cwd").mockReturnValue(root);
    await expect(loadProducts()).resolves.toHaveLength(1);
  });

  it("lê de novo a cada chamada (o next dev mostra a edição ao recarregar)", async () => {
    write("products/a.json", product({ name: "Antes" }));
    expect((await loadProducts({ root }))[0].name).toBe("Antes");
    write("products/a.json", product({ name: "Depois" }));
    expect((await loadProducts({ root }))[0].name).toBe("Depois");
  });
});

describe("loadHome", () => {
  it("home.json ausente = home vazia (o padrão do antigo siteConfig.home)", async () => {
    await expect(loadHome({ root, ...ALL })).resolves.toEqual({ sections: [] });
  });

  it("lê, remove o $schema e valida", async () => {
    write("home.json", { $schema: "x", sections: [faq] });
    await expect(loadHome({ root, ...ALL })).resolves.toEqual({ sections: [faq] });
  });

  it("formato do erro: arquivo → caminho: mensagem", async () => {
    write("home.json", { sections: [{ type: "faq", items: [{ question: "a" }] }] });
    const err = await contentError(loadHome({ root, ...ALL }));
    expect(err.message).toMatch(/content\/home\.json → sections\[0\]\.items\[0\]\.answer: \S/);
  });

  it("seção de módulo desligado: erro com as duas saídas", async () => {
    write("home.json", { sections: [faq, { type: "gallery" }] });
    const err = await contentError(loadHome({ root, modules: ["products", "services"] }));
    const [d] = err.diagnostics;
    expect(d).toMatchObject({ file: "content/home.json", path: "sections[1]", hint: "iris module add gallery" });
    expect(d.message).toContain("iris module add gallery");
    expect(d.message).toContain("remova a seção");
    await expect(loadHome({ root, modules: ["gallery"] })).resolves.toHaveProperty("sections");
  });

  it("seções do core valem com todos os módulos desligados", async () => {
    write("home.json", { sections: [faq] });
    await expect(loadHome({ root, modules: [] })).resolves.toEqual({ sections: [faq] });
  });

  it("limite por página do schema (faq no máximo 1) continua valendo", async () => {
    write("home.json", { sections: [faq, faq] });
    const err = await contentError(loadHome({ root, ...ALL }));
    expect(err.diagnostics[0].path).toBe("sections[1]");
  });

  it("home.json como link simbólico é recusado", async () => {
    const real = path.join(root, "home-real.json");
    writeFileSync(real, JSON.stringify({ sections: [] }));
    symlinkSync(real, path.join(root, "content/home.json"));
    const err = await contentError(loadHome({ root, ...ALL }));
    expect(err.message).toContain("link simbólico");
  });
});

describe("loadPages e loadPage", () => {
  it("lista as páginas ordenadas por slug, com o slug do nome do arquivo", async () => {
    write("pages/sobre.json", page());
    write("pages/contato.json", page({ title: "Contato" }));
    const pages = await loadPages({ root, ...ALL });
    expect(pages.map((p) => [p.slug, p.title])).toEqual([["contato", "Contato"], ["sobre", "Sobre"]]);
  });

  it("slug reservado é erro", async () => {
    write("pages/produtos.json", page());
    const err = await contentError(loadPages({ root, ...ALL }));
    expect(err.diagnostics[0].file).toBe("content/pages/produtos.json");
    expect(err.message).toContain("reservado");
  });

  it("formato do erro numa página: content/pages/sobre.json → sections[2].items[0].answer", async () => {
    write("pages/sobre.json", page({ sections: [{ type: "stats", items: [{ value: "1", label: "x" }] }, { type: "contact" }, { type: "faq", items: [{ question: "q" }] }] }));
    const err = await contentError(loadPages({ root, ...ALL }));
    expect(err.message).toMatch(/content\/pages\/sobre\.json → sections\[2\]\.items\[0\]\.answer: \S/);
  });

  it("seção de módulo desligado numa página também é erro", async () => {
    write("pages/sobre.json", page({ sections: [{ type: "products" }] }));
    const err = await contentError(loadPages({ root, modules: ["services"] }));
    expect(err.diagnostics[0].hint).toBe("iris module add products");
  });

  it("loadPage lê uma página; ausente = undefined", async () => {
    write("pages/sobre.json", page());
    await expect(loadPage("sobre", { root, ...ALL })).resolves.toMatchObject({ slug: "sobre", title: "Sobre" });
    await expect(loadPage("nada", { root, ...ALL })).resolves.toBeUndefined();
  });

  it("loadPage com slug inválido ou reservado devolve undefined sem tocar no disco", async () => {
    writeFileSync(path.join(root, "isca.json"), JSON.stringify(page()));
    write("pages/produtos.json", page());
    for (const slug of ["../isca", "../../isca", "/etc/passwd", "a/b", "Sobre", "produtos", "", "a".repeat(81)]) {
      await expect(loadPage(slug, { root, ...ALL })).resolves.toBeUndefined();
    }
  });

  it("loadPage com arquivo inválido lança erro", async () => {
    write("pages/sobre.json", page({ title: "" }));
    await contentError(loadPage("sobre", { root, ...ALL }));
  });
});

describe("conteúdo do apps/site", () => {
  const site = path.resolve(__dirname, "../../../apps/site");

  it("home, páginas, produtos e serviços validam com os módulos padrão", async () => {
    const home = await loadHome({ root: site, ...ALL });
    expect(home.sections.length).toBeGreaterThan(0);
    expect((await loadPages({ root: site, ...ALL })).map((p) => p.slug)).toEqual(["contato", "sobre"]);
    expect(await loadProducts({ root: site })).toHaveLength(5);
    expect(await loadServices({ root: site })).toHaveLength(4);
  });
});

// Correções da revisão de segurança da E5.
const DIST = path.resolve(__dirname, "../dist/content.mjs");
const posix = process.platform !== "win32";

/** Roda um loader num processo separado: um open que bloqueia não trava o vitest. */
function runIsolated(code: string) {
  const script = `import * as c from ${JSON.stringify(DIST)};\nconst root = ${JSON.stringify(root)};\nconst t = performance.now();\ntry { ${code}; console.log("SEM ERRO"); } catch (e) { console.log(e.name + ": " + e.message); }\nconsole.log("ms=" + Math.round(performance.now() - t));`;
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], { timeout: 10_000, encoding: "utf8" });
}

describe.runIf(posix)("FIFO e outros arquivos especiais", () => {
  it("content/home.json como FIFO: erro em menos de 1 s, sem travar", () => {
    execFileSync("mkfifo", [path.join(root, "content/home.json")]);
    const r = runIsolated(`await c.loadHome({ root, modules: [] })`);
    expect(r.error, "o processo travou (timeout)").toBeUndefined();
    expect(r.stdout).toContain("ContentError");
    expect(r.stdout).toContain("precisa ser um arquivo comum");
    expect(Number(/ms=(\d+)/.exec(r.stdout)?.[1])).toBeLessThan(1000);
  });

  it("content/pages/x.json como FIFO, por loadPage: erro em menos de 1 s", () => {
    mkdirSync(path.join(root, "content/pages"));
    execFileSync("mkfifo", [path.join(root, "content/pages/x.json")]);
    const r = runIsolated(`await c.loadPage("x", { root, modules: [] })`);
    expect(r.error, "o processo travou (timeout)").toBeUndefined();
    expect(r.stdout).toContain("precisa ser um arquivo comum");
    expect(Number(/ms=(\d+)/.exec(r.stdout)?.[1])).toBeLessThan(1000);
  });
});

describe("mensagens de erro sem eco do conteúdo", () => {
  it("JSON inválido não repete o começo do arquivo (pode ser um segredo)", async () => {
    write("products/a.json", "AWS_SECRET_ACCESS_KEY=abc\n");
    const err = await contentError(loadProducts({ root }));
    expect(err.message).not.toContain("AWS_SECRET");
    expect(err.message).toContain("content/products/a.json: JSON inválido");
  });

  it("JSON quebrado ainda mostra linha e coluna", async () => {
    write("products/a.json", '{\n  "name": "x",\n}');
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics[0].message).toMatch(/^JSON inválido \(linha 3, coluna 1\): confira vírgulas, aspas e chaves$/);
  });

  it("chave de 900000 caracteres: mensagem do diagnóstico truncada", async () => {
    write("products/a.json", product({ ["A".repeat(900_000)]: 1 }));
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics[0].message.length).toBeLessThanOrEqual(201);
    expect(err.diagnostics[0].message.endsWith("…")).toBe(true);
    expect(err.message.length).toBeLessThan(1000);
  });

  it("100 arquivos inválidos: a mensagem lista 50 e resume o resto; diagnostics guarda todos", async () => {
    for (let i = 0; i < 100; i++) write(`products/p${String(i).padStart(3, "0")}.json`, product({ price: "x" }));
    const err = await contentError(loadProducts({ root }));
    expect(err.diagnostics).toHaveLength(100);
    expect(err.message.split("\n")).toHaveLength(1 + 50 + 1);
    expect(err.message.endsWith("… e mais 50 erros")).toBe(true);
  });
});

describe.runIf(posix)("hard link", () => {
  it("arquivo com mais de um nome (hard link) é recusado", async () => {
    const outside = path.join(root, "fora.json");
    writeFileSync(outside, JSON.stringify(product()));
    mkdirSync(path.join(root, "content/products"));
    linkSync(outside, path.join(root, "content/products/a.json"));
    const err = await contentError(loadProducts({ root }));
    expect(err.message).toContain("hard link");
  });
});

describe("opts.modules obrigatório", () => {
  it.each([undefined, "products", ["blog"], [1]])("modules = %j é ContentError com mensagem clara", async (modules) => {
    const opts = { root, modules } as unknown as { root: string; modules: [] };
    for (const call of [loadHome(opts), loadPages(opts), loadPage("sobre", opts)]) {
      const err = await contentError(call);
      expect(err.message).toContain("modules");
    }
  });
});
