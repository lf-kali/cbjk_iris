import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FORBIDDEN_TERMS, scanClientBundle } from "../lib/client-bundle.mjs";

// R-1 (E4): nada de zod nem de código de Node do engine nos chunks que vão ao navegador.

let root;
beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-client-bundle-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel, text) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

describe("scanClientBundle", () => {
  it("pasta limpa: nenhum achado, e conta os arquivos lidos", () => {
    write("chunks/a.js", "console.log('ok')");
    write("css/b.css", ".a{color:red}");
    expect(scanClientBundle(root)).toEqual({ files: 2, hits: [] });
  });

  it("acha cada termo proibido, em qualquer subpasta, com o caminho relativo em formato POSIX", () => {
    FORBIDDEN_TERMS.forEach((term, i) => write(`chunks/n${i}/f.js`, `var x = "${term}";`));
    const { hits } = scanClientBundle(root);
    expect(hits.map((hit) => hit.term).sort()).toEqual([...FORBIDDEN_TERMS].sort());
    expect(hits.every((hit) => /^chunks\/n\d+\/f\.js$/.test(hit.file))).toBe(true);
  });

  it("acha o termo no meio de outra palavra, como o grep -E (ex.: zod dentro de um identificador)", () => {
    write("a.js", "const fooZodBar = 1; const xzody = 2;");
    expect(scanClientBundle(root).hits).toEqual([{ file: "a.js", term: "zod" }]);
  });

  it("lê arquivo binário e .map também (o grep -r lê tudo)", () => {
    writeFileSync(path.join(root, "x.bin"), Buffer.concat([Buffer.from([0, 255, 1]), Buffer.from("child_process")]));
    write("a.js.map", '{"sources":["spawnSync"]}');
    expect(scanClientBundle(root).hits.map((hit) => hit.file).sort()).toEqual(["a.js.map", "x.bin"]);
  });

  it("pasta inexistente: erro (não passa em branco se o build não rodou)", () => {
    expect(() => scanClientBundle(path.join(root, "nao-existe"))).toThrow(/npm run build/);
  });

  it("pasta vazia: erro", () => {
    expect(() => scanClientBundle(root)).toThrow(/nenhum arquivo/);
  });

  it("caminho que é arquivo: erro", () => {
    write("a.js", "x");
    expect(() => scanClientBundle(path.join(root, "a.js"))).toThrow(/não é uma pasta/);
  });

  it.runIf(process.platform !== "win32")("link simbólico dentro da pasta: erro, sem seguir o link", () => {
    write("a.js", "x");
    const outside = mkdtempSync(path.join(os.tmpdir(), "iris-client-bundle-out-"));
    try {
      writeFileSync(path.join(outside, "z.js"), "zod");
      symlinkSync(path.join(outside, "z.js"), path.join(root, "link.js"));
      expect(() => scanClientBundle(root)).toThrow(/link simbólico/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
