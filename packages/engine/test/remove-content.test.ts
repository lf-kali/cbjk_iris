import { chmodSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// RemoveModuleContent (SPEC §5.6): tira as seções de um módulo de content/home.json e content/pages/*.json.
// Portado de scripts/lib/modules-check-content.mjs (E6b). Nunca escreve fora de content/.

// rename controlável, para provar que uma falha no meio não deixa .tmp para trás
const fsState = vi.hoisted(() => ({ failRename: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    renameSync: (from: string, to: string) => {
      if (fsState.failRename) throw Object.assign(new Error("rename falhou (teste)"), { code: "EIO" });
      return actual.renameSync(from, to);
    },
  };
});

const { removeModuleContent } = await import("../src/modules/remove-content");

let root: string;
let outside: string;
const home = { $schema: "../node_modules/x.json", sections: [{ type: "faq", items: [] }, { type: "gallery" }], extra: 1 };

beforeEach(() => {
  fsState.failRename = false;
  root = mkdtempSync(path.join(os.tmpdir(), "iris-remove-content-"));
  outside = mkdtempSync(path.join(os.tmpdir(), "iris-remove-content-fora-"));
  mkdirSync(path.join(root, "content/pages"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const write = (rel: string, data: unknown) => writeFileSync(path.join(root, rel), JSON.stringify(data));

describe("removeModuleContent", () => {
  it("tira as seções do módulo da home e das páginas, mantendo $schema e a ordem das chaves", () => {
    write("content/home.json", home);
    write("content/pages/sobre.json", { title: "Sobre", sections: [{ type: "gallery" }] });
    write("content/pages/contato.json", { title: "Contato", sections: [{ type: "faq", items: [] }] });
    const result = removeModuleContent(root, "gallery");
    expect(result.changes).toEqual([
      { path: "content/home.json", action: "update" },
      { path: "content/pages/sobre.json", action: "update" },
    ]);
    expect(read("content/home.json")).toBe(
      `${JSON.stringify({ $schema: home.$schema, sections: [{ type: "faq", items: [] }], extra: 1 }, null, 2)}\n`,
    );
    expect(JSON.parse(read("content/pages/sobre.json")).sections).toEqual([]);
    expect(read("content/pages/contato.json")).toBe(JSON.stringify({ title: "Contato", sections: [{ type: "faq", items: [] }] }));
    expect(removeModuleContent(root, "gallery").changes).toEqual([]);
  });

  it("dryRun: devolve as mudanças e não escreve", () => {
    write("content/home.json", home);
    const before = read("content/home.json");
    expect(removeModuleContent(root, "gallery", { dryRun: true }).changes).toEqual([{ path: "content/home.json", action: "update" }]);
    expect(read("content/home.json")).toBe(before);
  });

  it("módulo sem seção no conteúdo, ou sem home e páginas: nada muda", () => {
    expect(removeModuleContent(root, "products").changes).toEqual([]);
    write("content/home.json", home);
    expect(removeModuleContent(root, "products").changes).toEqual([]);
  });

  it("id de módulo inválido: erro", () => {
    expect(() => removeModuleContent(root, "nao-existe" as never)).toThrow(/products, services, gallery/);
  });

  it.runIf(process.platform !== "win32")("home.json como link simbólico: erro, e o arquivo de fora não muda", () => {
    const target = path.join(outside, "home.json");
    writeFileSync(target, JSON.stringify(home));
    symlinkSync(target, path.join(root, "content/home.json"));
    expect(() => removeModuleContent(root, "gallery")).toThrow(/link simbólico/);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(home);
  });

  it.runIf(process.platform !== "win32")("content/pages como link simbólico: erro, e nada de fora muda", () => {
    const target = path.join(outside, "sobre.json");
    writeFileSync(target, JSON.stringify(home));
    rmSync(path.join(root, "content/pages"), { recursive: true });
    symlinkSync(outside, path.join(root, "content/pages"));
    expect(() => removeModuleContent(root, "gallery")).toThrow(/link simbólico/);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(home);
  });

  it.runIf(process.platform !== "win32")("home.json como hard link: erro, e o arquivo de fora não muda", () => {
    const target = path.join(outside, "home.json");
    writeFileSync(target, JSON.stringify(home));
    linkSync(target, path.join(root, "content/home.json"));
    expect(() => removeModuleContent(root, "gallery")).toThrow(/hard link/);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(home);
  });

  it("home.json que é pasta: erro claro", () => {
    mkdirSync(path.join(root, "content/home.json"));
    expect(() => removeModuleContent(root, "gallery")).toThrow(/arquivo comum/);
  });

  it("um arquivo inválido impede todas as escritas", () => {
    write("content/home.json", home);
    writeFileSync(path.join(root, "content/pages/sobre.json"), "{ quebrado");
    const before = read("content/home.json");
    expect(() => removeModuleContent(root, "gallery")).toThrow(/content\/pages\/sobre\.json/);
    expect(read("content/home.json")).toBe(before);
  });

  it("falha no rename: o erro sobe e nenhum .tmp fica para trás", () => {
    write("content/home.json", home);
    const before = read("content/home.json");
    fsState.failRename = true;
    expect(() => removeModuleContent(root, "gallery")).toThrow(/rename falhou/);
    expect(readdirSync(path.join(root, "content")).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    expect(read("content/home.json")).toBe(before);
  });

  it("sem content/: erro claro", () => {
    rmSync(path.join(root, "content"), { recursive: true });
    expect(() => removeModuleContent(root, "gallery")).toThrow(/content\/ não encontrada/);
  });

  describe("números que o JSON.stringify mudaria (perda silenciosa)", () => {
    const withNumber = (literal: string) =>
      `{ "sections": [{ "type": "gallery" }, { "type": "stats", "items": [{ "value": ${literal}, "label": "x" }] }] }`;

    it.each(["1e400", "12345678901234567890", "0.1000000000000000055511151231257827"])(
      "%s: recusa o arquivo e não grava nenhum",
      (literal) => {
        write("content/pages/sobre.json", { title: "Sobre", sections: [{ type: "gallery" }] });
        writeFileSync(path.join(root, "content/home.json"), withNumber(literal));
        const before = { home: read("content/home.json"), sobre: read("content/pages/sobre.json") };
        expect(() => removeModuleContent(root, "gallery")).toThrow(/números que o JavaScript não representa com exatidão/);
        expect({ home: read("content/home.json"), sobre: read("content/pages/sobre.json") }).toEqual(before);
      },
    );

    it.each(["19.9", "0.5", "42", "-3", "1.0", "19.90", "1e3", "0"])("%s: número comum passa", (literal) => {
      writeFileSync(path.join(root, "content/home.json"), withNumber(literal));
      expect(removeModuleContent(root, "gallery").changes).toHaveLength(1);
      expect(JSON.parse(read("content/home.json")).sections[0].items[0].value).toBe(Number(literal));
    });

    it("número dentro de texto não conta", () => {
      writeFileSync(path.join(root, "content/home.json"), withNumber('"12345678901234567890 e 1e400"'));
      expect(removeModuleContent(root, "gallery").changes).toHaveLength(1);
    });
  });

  it.runIf(process.platform !== "win32")("mantém a permissão do arquivo original (0600 continua 0600)", () => {
    write("content/home.json", home);
    chmodSync(path.join(root, "content/home.json"), 0o600);
    removeModuleContent(root, "gallery");
    expect(statSync(path.join(root, "content/home.json")).mode & 0o777).toBe(0o600);
  });

  it.runIf(process.platform !== "win32")("não carrega setuid, setgid nem sticky do arquivo original", () => {
    write("content/home.json", home);
    chmodSync(path.join(root, "content/home.json"), 0o1644);
    removeModuleContent(root, "gallery");
    expect(statSync(path.join(root, "content/home.json")).mode & 0o7777).toBe(0o644);
  });

  it.runIf(process.platform !== "win32")("content/ como link para fora do projeto: lê, mas recusa gravar", () => {
    mkdirSync(path.join(outside, "content/pages"), { recursive: true });
    writeFileSync(path.join(outside, "content/home.json"), JSON.stringify(home));
    rmSync(path.join(root, "content"), { recursive: true });
    symlinkSync(path.join(outside, "content"), path.join(root, "content"));
    expect(() => removeModuleContent(root, "gallery")).toThrow(/fora da pasta do projeto/);
    expect(JSON.parse(readFileSync(path.join(outside, "content/home.json"), "utf8"))).toEqual(home);
    expect(removeModuleContent(root, "gallery", { dryRun: true }).changes).toHaveLength(1);
  });
});
