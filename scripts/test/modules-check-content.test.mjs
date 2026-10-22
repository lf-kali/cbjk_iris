import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeSectionsFromContent } from "../lib/modules-check-content.mjs";

// npm run modules:check edita os JSON de conteúdo da cópia (apps/.modules-check-*). Nunca pode
// escrever fora dela: link simbólico no caminho é erro.
let dir;
let outside;
const home = { $schema: "x", sections: [{ type: "faq" }, { type: "gallery" }] };

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "iris-modules-check-"));
  outside = mkdtempSync(path.join(os.tmpdir(), "iris-modules-check-fora-"));
  mkdirSync(path.join(dir, "content/pages"), { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

const json = (file) => JSON.parse(readFileSync(file, "utf8"));

describe("removeSectionsFromContent", () => {
  it("tira as seções dos tipos pedidos da home e das páginas, mantendo o $schema", () => {
    writeFileSync(path.join(dir, "content/home.json"), JSON.stringify(home));
    writeFileSync(path.join(dir, "content/pages/sobre.json"), JSON.stringify({ title: "S", sections: [{ type: "gallery" }] }));
    removeSectionsFromContent(dir, ["gallery"]);
    expect(json(path.join(dir, "content/home.json"))).toEqual({ $schema: "x", sections: [{ type: "faq" }] });
    expect(json(path.join(dir, "content/pages/sobre.json")).sections).toEqual([]);
  });

  it.runIf(process.platform !== "win32")("home.json como link simbólico: erro, e o arquivo de fora não muda", () => {
    const target = path.join(outside, "home.json");
    writeFileSync(target, JSON.stringify(home));
    symlinkSync(target, path.join(dir, "content/home.json"));
    expect(() => removeSectionsFromContent(dir, ["gallery"])).toThrow(/link simbólico/);
    expect(json(target)).toEqual(home);
  });

  it.runIf(process.platform !== "win32")("content/pages como link simbólico: erro, e nada de fora muda", () => {
    const target = path.join(outside, "sobre.json");
    writeFileSync(target, JSON.stringify(home));
    rmSync(path.join(dir, "content/pages"), { recursive: true });
    symlinkSync(outside, path.join(dir, "content/pages"));
    expect(() => removeSectionsFromContent(dir, ["gallery"])).toThrow(/link simbólico/);
    expect(json(target)).toEqual(home);
  });

  it.runIf(process.platform !== "win32")("home.json como hard link: erro, e o arquivo de fora não muda", () => {
    const target = path.join(outside, "home.json");
    writeFileSync(target, JSON.stringify(home));
    linkSync(target, path.join(dir, "content/home.json"));
    expect(() => removeSectionsFromContent(dir, ["gallery"])).toThrow(/hard link/);
    expect(json(target)).toEqual(home);
  });

  it("home.json que é pasta: erro claro, nada gravado", () => {
    mkdirSync(path.join(dir, "content/home.json"));
    expect(() => removeSectionsFromContent(dir, ["gallery"])).toThrow(/arquivo comum/);
  });
});
