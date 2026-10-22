import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_CONTENT_FILE_BYTES } from "../src/content";
import { jsonErrorMessage, readCapped, readText, type ContentContext } from "../src/content/read";

// Auxiliares internos de read.ts (exportados só para teste): os caminhos que os loaders não alcançam
// no uso comum (o fstat já recusa o arquivo grande; o lstat já recusa o link).
let root: string;
let ctx: ContentContext;

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "iris-read-"));
  mkdirSync(path.join(root, "content"));
  ctx = { root, base: path.join(root, "content") };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function withFd<T>(file: string, fn: (fd: number) => T): T {
  const fd = openSync(file, "r");
  try {
    return fn(fd);
  } finally {
    closeSync(fd);
  }
}

describe("readCapped (limite rígido, independente do fstat)", () => {
  it("1 MiB + 1 byte: recusa (null), que vira o erro 'maior que 1 MiB'", () => {
    const file = path.join(root, "grande.json");
    writeFileSync(file, Buffer.alloc(MAX_CONTENT_FILE_BYTES + 1, 0x20));
    expect(withFd(file, readCapped)).toBeNull();
  });

  it("exatamente 1 MiB: lê tudo", () => {
    const file = path.join(root, "limite.json");
    writeFileSync(file, Buffer.alloc(MAX_CONTENT_FILE_BYTES, 0x20));
    expect(withFd(file, readCapped)?.length).toBe(MAX_CONTENT_FILE_BYTES);
  });
});

describe.runIf(process.platform !== "win32")("readText abrindo direto (sem o lstat de antes)", () => {
  it("link simbólico: O_NOFOLLOW dá ELOOP, que vira o erro de link", () => {
    writeFileSync(path.join(root, "alvo.json"), "{}");
    const link = path.join(root, "content/a.json");
    symlinkSync(path.join(root, "alvo.json"), link);
    const d = readText(ctx, link, "content/a.json");
    expect(typeof d === "object" && d.message).toContain("link simbólico");
  });

  it("outro erro do open (arquivo sumiu) é relançado", () => {
    expect(() => readText(ctx, path.join(root, "content/nada.json"), "content/nada.json")).toThrow(/ENOENT/);
  });
});

describe("jsonErrorMessage", () => {
  it("só com a posição (sem linha e coluna do V8): calcula linha e coluna, sem eco do texto", () => {
    const msg = jsonErrorMessage(new SyntaxError("Unexpected token 'S', \"SEGREDO\" is not valid JSON at position 4"), "{\n  SEGREDO");
    expect(msg).toBe("JSON inválido (linha 2, coluna 3): confira vírgulas, aspas e chaves");
  });

  it("sem posição nenhuma: só o texto fixo", () => {
    expect(jsonErrorMessage("não é Error", "x")).toBe("JSON inválido: confira vírgulas, aspas e chaves");
  });
});
