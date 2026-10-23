import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { atLeast, findNpmDir, loadNpmModules } from "../lib/npm-modules.mjs";
import { entry, tgz } from "./helpers/tar-fixtures.mjs";

// CLI scripts/check-tarballs.mjs, como o job "publish" do release.yml o chama. Inclui o cenário do
// security-reviewer da rodada 5: variáveis de OIDC do GitHub Actions apontando para um servidor local.

const CLI = fileURLToPath(new URL("../check-tarballs.mjs", import.meta.url));
const NPM_BIN = process.env.npm_execpath;
const NPM_OK = atLeast(loadNpmModules(findNpmDir(NPM_BIN)).npmVersion, "11.5.1");
const NAMES = ["@cbjk_iris/schema", "@cbjk_iris/engine"];

let server;
let port;
const requests = [];
beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    res.setHeader("content-type", "application/json");
    // ID token com repository_visibility public, como o GitHub daria
    res.end(req.url.startsWith("/idtoken") ? JSON.stringify({ value: "aaa.eyJyZXBvc2l0b3J5X3Zpc2liaWxpdHkiOiJwdWJsaWMifQ.ccc" }) : "{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "iris-cli-"));
  requests.length = 0;
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const pkg = (name, over = {}) => ({ name, version: "0.1.0", publishConfig: { access: "public" }, ...over });

/** Artefato com um tarball por nome e o "repositório" com os package.json do mesmo commit. */
function setup(tarManifests = NAMES.map((n) => pkg(n)), repoManifests = NAMES.map((n) => pkg(n))) {
  const art = path.join(tmp, "release");
  mkdirSync(art);
  const files = tarManifests.map((m, i) => {
    const f = `p${i}-0.1.0.tgz`;
    writeFileSync(path.join(art, f), tgz(entry("package/package.json", JSON.stringify(m)), entry("package/index.js", "export {}")));
    return f;
  });
  writeFileSync(path.join(art, "order.txt"), `${files.join("\n")}\n`);
  const repo = path.join(tmp, "repo");
  repoManifests.forEach((m, i) => {
    mkdirSync(path.join(repo, "packages", `p${i}`), { recursive: true });
    writeFileSync(path.join(repo, "packages", `p${i}`, "package.json"), JSON.stringify(m, null, 2));
  });
  return { art, repo, files };
}

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd: tmp, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}
const oidcEnv = () => ({
  GITHUB_ACTIONS: "true",
  ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${port}/idtoken`,
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "segredo",
  NPM_ID_TOKEN: "",
});

describe("check-tarballs.mjs", () => {
  it("uso errado: saída 1", async () => {
    expect((await run(["x"])).status).toBe(1);
    expect((await run(["--npm", NPM_BIN, "--repo"])).status).toBe(1);
  });

  // npm falso: pasta com package.json "npm" e um binário que só responde --version
  function fakeNpm(dirVersion, binVersion) {
    const dir = path.join(tmp, "fake", "lib", "node_modules", "npm");
    mkdirSync(path.join(dir, "bin"), { recursive: true });
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "npm", version: dirVersion }));
    const bin = path.join(dir, "bin", "npm-cli.js");
    writeFileSync(bin, `#!/usr/bin/env node\nconsole.log(${JSON.stringify(binVersion)});\n`);
    chmodSync(bin, 0o755);
    return bin;
  }

  it.runIf(process.platform !== "win32")("npm abaixo de 11.5.1: saída 1, antes de qualquer leitura", async () => {
    const { art, repo } = setup();
    const r = await run(["--npm", fakeNpm("11.5.0", "11.5.0"), "--repo", repo, art, ...NAMES]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/npm 11\.5\.0: trusted publishing exige 11\.5\.1/);
  });

  it.runIf(process.platform !== "win32")("binário e pasta do npm com versões diferentes: saída 1", async () => {
    const { art, repo } = setup();
    const r = await run(["--npm", fakeNpm("11.20.0", "11.19.1"), "--repo", repo, art, ...NAMES]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/o binário diz npm 11\.19\.1, mas a pasta é do npm 11\.20\.0/);
  });

  it("artefato ruim (tarball fora da lista): saída 1, nada na saída padrão", async () => {
    const { art, repo } = setup([pkg("evil"), pkg(NAMES[1])]);
    const r = await run(["--npm", NPM_BIN, "--repo", repo, art, ...NAMES]);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe("");
  });

  it.runIf(NPM_OK)("artefato bom: saída 0 e uma linha \"<tgz> <nome>@<versão> <sha256>\" por pacote", { timeout: 60_000 }, async () => {
    const { art, repo, files } = setup();
    const r = await run(["--npm", NPM_BIN, "--repo", repo, path.relative(tmp, art), ...NAMES]);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const sha = (f) => createHash("sha256").update(readFileSync(path.join(art, f))).digest("hex");
    expect(r.stdout.trim().split("\n")).toEqual(files.map((f, i) => `${f} ${NAMES[i]}@0.1.0 ${sha(f)}`));
  });

  it.runIf(NPM_OK)("tarball diferente do package.json do repositório: saída 1", { timeout: 60_000 }, async () => {
    const { art, repo } = setup(undefined, [pkg(NAMES[0]), pkg(NAMES[1], { description: "outra" })]);
    const r = await run(["--npm", NPM_BIN, "--repo", repo, art, ...NAMES]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/description/);
  });

  it.runIf(NPM_OK)("cenário do revisor, tarball bom com OIDC no ambiente: nenhuma requisição chega ao servidor", { timeout: 60_000 }, async () => {
    const { art, repo } = setup();
    const r = await run(["--npm", NPM_BIN, "--repo", repo, art, ...NAMES], oidcEnv());
    expect(requests).toEqual([]);
    expect(r.status).toBe(0);
  });

  it.runIf(NPM_OK)("cenário do revisor, publishConfig com @cbjk_iris:registry local: recusado e nenhuma requisição", { timeout: 60_000 }, async () => {
    const evil = pkg(NAMES[0], { publishConfig: { access: "public", "@cbjk_iris:registry": `http://127.0.0.1:${port}/` } });
    const { art, repo } = setup([evil, pkg(NAMES[1])], [evil, pkg(NAMES[1])]);
    const r = await run(["--npm", NPM_BIN, "--repo", repo, art, ...NAMES], oidcEnv());
    expect(requests).toEqual([]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/publishConfig\.@cbjk_iris:registry não é permitido/);
  });
});

describe("na CI com Node 24 ou mais novo, os testes que exigem npm 11.5.1+ não pulam em silêncio", () => {
  it("npm do ambiente", () => {
    const major = Number(process.versions.node.split(".")[0]);
    if (process.env.CI && major >= 24) expect(NPM_OK, `npm do Node ${process.versions.node}`).toBe(true);
  });
});
