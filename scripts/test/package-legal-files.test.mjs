import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { LEGAL_FILES, legalFileProblems, publishablePackageDirs } from "../lib/legal-files.mjs";

// LICENSE e NOTICE em cada pacote publicado (plano da Frente 1, §6, pendência da E7 resolvida na E9).
// Os temas Apache-2.0 do engine exigem o NOTICE junto da redistribuição, e o tarball só leva o que
// está na pasta do pacote. Mecanismo: cópias versionadas em cada pacote, iguais byte a byte às da
// raiz, e "NOTICE" no `files` (o npm já leva LICENSE sempre). Sem script de `prepack`, que o
// release-check proíbe nos pacotes publicáveis. Os pacotes são descobertos pelos workspaces da raiz,
// com a mesma regra do release-check (pasta sem "." no começo, com package.json e sem "private": true).

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Lista de arquivos do `npm pack --dry-run --json` (npm 11: array; npm 12: objeto por nome). */
function packedFiles(dir) {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const parsed = JSON.parse(out);
  const info = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  return info.files.map((f) => f.path);
}

describe("repositório", () => {
  it("descobre os 5 pacotes publicáveis pelos workspaces", () => {
    expect(publishablePackageDirs(ROOT)).toEqual([
      "packages/cli", "packages/core", "packages/create", "packages/engine", "packages/schema",
    ]);
  });

  it("nenhum problema de LICENSE ou NOTICE", () => {
    expect(legalFileProblems(ROOT)).toEqual([]);
  });

  it.each(publishablePackageDirs(ROOT))("%s: o tarball leva LICENSE e NOTICE na raiz do pacote", (dir) => {
    const files = packedFiles(path.join(ROOT, dir));
    for (const name of LEGAL_FILES) expect(files).toContain(name);
  }, 60_000);
});

describe("projeto de teste", () => {
  let root;
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function project({ extra = {}, legal = true } = {}) {
    root = mkdtempSync(path.join(os.tmpdir(), "iris-legal-"));
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*", "apps/*"] }));
    writeFileSync(path.join(root, "LICENSE"), "MIT\n");
    writeFileSync(path.join(root, "NOTICE"), "aviso\n");
    const pkg = (dir, json, withLegal) => {
      mkdirSync(path.join(root, dir), { recursive: true });
      writeFileSync(path.join(root, dir, "package.json"), JSON.stringify(json));
      if (withLegal) for (const f of LEGAL_FILES) writeFileSync(path.join(root, dir, f), f === "LICENSE" ? "MIT\n" : "aviso\n");
    };
    pkg("packages/a", { name: "a" }, legal);
    pkg("apps/site", { name: "site", private: true }, false);
    pkg("packages/.copia", { name: "copia" }, false);
    for (const [dir, json] of Object.entries(extra)) pkg(dir, json, false);
    return root;
  }

  it("pacote publicável novo sem LICENSE e NOTICE é apontado", () => {
    project({ extra: { "packages/extra": { name: "extra" } } });
    expect(publishablePackageDirs(root)).toEqual(["packages/a", "packages/extra"]);
    expect(legalFileProblems(root)).toEqual([
      "packages/extra/LICENSE: ausente",
      "packages/extra/NOTICE: ausente",
    ]);
  });

  it('"private": true, pasta com ponto e pasta sem package.json ficam de fora', () => {
    project({ extra: { "packages/privado": { name: "p", private: true } } });
    mkdirSync(path.join(root, "packages/sem-manifesto"));
    expect(publishablePackageDirs(root)).toEqual(["packages/a"]);
    expect(legalFileProblems(root)).toEqual([]);
  });

  it('"private" vale pela verdade do valor, como no release-check e no npm publish', () => {
    project({ extra: { "packages/b": { name: "b", private: "true" }, "packages/c": { name: "c", private: false } } });
    expect(publishablePackageDirs(root)).toEqual(["packages/a", "packages/c"]);
  });

  it("cópia diferente da raiz e link simbólico são apontados", () => {
    project();
    writeFileSync(path.join(root, "packages/a/NOTICE"), "outro aviso\n");
    rmSync(path.join(root, "packages/a/LICENSE"));
    symlinkSync(path.join(root, "LICENSE"), path.join(root, "packages/a/LICENSE"));
    expect(legalFileProblems(root)).toEqual([
      "packages/a/LICENSE: precisa ser arquivo comum (o npm pack não segue link simbólico)",
      "packages/a/NOTICE: diferente do NOTICE da raiz",
    ]);
  });

  it("padrão de workspace não suportado é erro", () => {
    project();
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ workspaces: ["packages/**"] }));
    expect(() => publishablePackageDirs(root)).toThrow(/padrão de workspace não suportado/);
  });
});
