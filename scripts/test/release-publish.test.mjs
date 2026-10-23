import { spawn, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { atLeast, findNpmDir } from "../lib/npm-modules.mjs";
import { entry, MALICIOUS, tgz } from "./helpers/tar-fixtures.mjs";

// O shell do passo "Publicar" do .github/workflows/release.yml, extraído do YAML e rodado com um npm
// falso no PATH. O npm falso tem a estrutura de um npm instalado, com uma cópia do node_modules do npm
// real (o tar e o pacote da conferência são os de verdade), e manda o dry-run de conferência para o npm
// real. "view" e o "publish --provenance" final são só registrados: nada vai ao registro.

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const NPM_BIN = process.env.npm_execpath;
const REAL_DIR = findNpmDir(NPM_BIN);
const REAL_VERSION = JSON.parse(readFileSync(path.join(REAL_DIR, "package.json"), "utf8")).version;
const NPM_OK = atLeast(REAL_VERSION, "11.5.1");
const HAS_BASH = process.platform !== "win32" && spawnSync("bash", ["-c", "true"]).status === 0;
const CAN_RUN = NPM_OK && HAS_BASH;
const NAMES = ["@cbjk_iris/schema", "@cbjk_iris/engine", "@cbjk_iris/core", "@cbjk_iris/cli", "create-iris-site"];
const STEP = "Publicar (npm publish --provenance)";

/** O "run" do passo de publicar, como o GitHub Actions vai executar. */
export function publishScript(yamlText) {
  const doc = parse(yamlText);
  const step = (doc?.jobs?.publish?.steps ?? []).find((s) => s?.name === STEP);
  if (!step || typeof step.run !== "string") throw new Error(`passo "${STEP}" não encontrado no release.yml`);
  return step.run;
}

describe("publishScript (extração do run do release.yml)", () => {
  it("acha o passo de publicar e devolve o shell", () => {
    const script = publishScript(readFileSync(path.join(ROOT, ".github/workflows/release.yml"), "utf8"));
    expect(script).toMatch(/check-tarballs\.mjs/);
    expect(script).toMatch(/--provenance --access public/);
  });

  it("sem o passo: erro", () => {
    expect(() => publishScript("jobs:\n  publish:\n    steps: []\n")).toThrow(/não encontrado/);
  });
});

describe("na CI com Node 24 ou mais novo, o npm é 11.5.1 ou mais novo (os testes do release não pulam em silêncio)", () => {
  it("npm do ambiente", () => {
    const major = Number(process.versions.node.split(".")[0]);
    if (process.env.CI && major >= 24) expect(NPM_OK, `npm ${REAL_VERSION} no Node ${process.versions.node}`).toBe(true);
  });
});

describe.runIf(CAN_RUN)("shell do passo de publicar do release.yml", () => {
  const script = CAN_RUN ? publishScript(readFileSync(path.join(ROOT, ".github/workflows/release.yml"), "utf8")) : "";
  let base;
  let fake;
  let tmp;

  // npm falso: lê a configuração do cenário de harness.json ao lado dele (o check-tarballs limpa o ambiente)
  const fakeNpm = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "harness.json"), "utf8"));
const args = process.argv.slice(2);
const isFinal = args[0] === "publish" && args.includes("--provenance");
fs.appendFileSync(cfg.log, JSON.stringify({ args, oidc: Boolean(process.env.GITHUB_ACTIONS || process.env.ACTIONS_ID_TOKEN_REQUEST_URL) }) + "\\n");
if (args[0] === "--version") { console.log(cfg.version); process.exit(0); }
if (args[0] === "publish" && !isFinal) {
  try { process.stdout.write(execFileSync(cfg.realNpm, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); process.exit(0); }
  catch (e) { process.stdout.write(e.stdout || ""); process.exit(e.status || 1); }
}
if (args[0] === "view") {
  const spec = args[1]; const at = spec.lastIndexOf("@"); const name = spec.slice(0, at); const v = spec.slice(at + 1);
  const mode = cfg.view[name] || "404";
  if (mode === "published") { console.log(JSON.stringify(v)); process.exit(0); }
  if (mode === "404") { console.log(JSON.stringify({ error: { code: "E404" } })); process.exit(1); }
  console.log(JSON.stringify({ error: { code: mode } })); process.exit(1);
}
if (isFinal && cfg.tamperAfterFirstPublish) fs.appendFileSync(cfg.tamperAfterFirstPublish, "x");
process.exit(0);
`;

  beforeAll(() => {
    base = mkdtempSync(path.join(os.tmpdir(), "iris-release-publish-"));
    fake = path.join(base, "lib", "node_modules", "npm");
    mkdirSync(path.join(fake, "bin"), { recursive: true });
    writeFileSync(path.join(fake, "package.json"), JSON.stringify({ name: "npm", version: REAL_VERSION }));
    // cópia, não link: a conferência recusa módulo resolvido fora da pasta do npm
    cpSync(path.join(REAL_DIR, "node_modules"), path.join(fake, "node_modules"), { recursive: true });
    writeFileSync(path.join(fake, "bin", "npm-cli.js"), fakeNpm);
    chmodSync(path.join(fake, "bin", "npm-cli.js"), 0o755);
  }, 120_000);
  afterAll(() => rmSync(base, { recursive: true, force: true }));
  beforeEach(() => {
    tmp = mkdtempSync(path.join(base, "cenario-"));
  });

  const manifest = (name) => ({ name, version: "0.1.0", license: "MIT", publishConfig: { access: "public" } });

  /** Artefato com os 5 pacotes e um "checkout" com scripts/ (o de verdade) e packages/*. */
  function setup({ replace } = {}) {
    const art = path.join(tmp, "release");
    const repo = path.join(tmp, "repo");
    mkdirSync(art);
    mkdirSync(repo);
    symlinkSync(path.join(ROOT, "scripts"), path.join(repo, "scripts"), "dir");
    const files = NAMES.map((name, i) => {
      const f = `p${i}-0.1.0.tgz`;
      writeFileSync(path.join(art, f), replace?.[i] ?? tgz(entry("package/package.json", JSON.stringify(manifest(name))), entry("package/index.js", "export {}")));
      mkdirSync(path.join(repo, "packages", `p${i}`), { recursive: true });
      writeFileSync(path.join(repo, "packages", `p${i}`, "package.json"), JSON.stringify(manifest(name), null, 2));
      return f;
    });
    writeFileSync(path.join(art, "order.txt"), `${files.join("\n")}\n`);
    return { art, repo, files };
  }

  function runStep({ art, repo }, { dry = "false", view = {}, tamperAfterFirstPublish = null } = {}) {
    const log = path.join(tmp, "npm.log");
    writeFileSync(log, "");
    writeFileSync(path.join(fake, "harness.json"), JSON.stringify({ log, view, version: REAL_VERSION, realNpm: NPM_BIN, tamperAfterFirstPublish }));
    const bin = path.join(tmp, "bin");
    mkdirSync(bin);
    symlinkSync(path.join(fake, "bin", "npm-cli.js"), path.join(bin, "npm"));
    return new Promise((resolve) => {
      // como o GitHub Actions roda "shell: bash"
      const child = spawn("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], {
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          ART: art,
          REPO: repo,
          DRY_RUN: dry,
          RUNNER_TEMP: tmp,
          GITHUB_ACTIONS: "true",
          ACTIONS_ID_TOKEN_REQUEST_URL: "http://127.0.0.1:9/idtoken",
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: "segredo",
        },
      });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));
      child.stdout.on("data", () => {});
      child.on("close", (status) => {
        const calls = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
        const kind = (c) => (c.args[0] === "publish" ? (c.args.includes("--provenance") ? "publish" : "dry-run") : c.args[0]);
        resolve({ status, stderr, calls, kinds: calls.map(kind), publishes: calls.filter((c) => kind(c) === "publish") });
      });
    });
  }

  it("caminho feliz: 5 views antes do 1º publish, depois 5 publishes com --provenance, na ordem", { timeout: 120_000 }, async () => {
    const s = setup();
    const r = await runStep(s);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const firstPublish = r.kinds.indexOf("publish");
    expect(r.kinds.filter((k) => k === "view")).toHaveLength(5);
    expect(r.kinds.lastIndexOf("view")).toBeLessThan(firstPublish);
    expect(r.publishes.map((c) => path.basename(c.args[1]))).toEqual(s.files);
    expect(r.publishes.every((c) => c.args.includes("--access") && !c.args.includes("--dry-run"))).toBe(true);
  });

  it("dry-run de conferência: leva --ignore-scripts e roda sem as variáveis de OIDC", { timeout: 120_000 }, async () => {
    const r = await runStep(setup());
    const dry = r.calls.filter((c) => c.args[0] === "publish" && !c.args.includes("--provenance"));
    expect(dry).toHaveLength(5);
    expect(dry.every((c) => c.args.includes("--ignore-scripts") && c.args.includes("--dry-run") && c.args.includes("--json"))).toBe(true);
    expect(dry.every((c) => c.oidc === false)).toBe(true);
  });

  it("dry_run marcado: os 5 publishes levam --dry-run", { timeout: 120_000 }, async () => {
    const r = await runStep(setup(), { dry: "true" });
    expect(r.status).toBe(0);
    expect(r.publishes).toHaveLength(5);
    expect(r.publishes.every((c) => c.args.includes("--dry-run"))).toBe(true);
  });

  it("tarball adulterado depois do 1º publish: para com 1, só o 1º foi publicado", { timeout: 120_000 }, async () => {
    const s = setup();
    const r = await runStep(s, { tamperAfterFirstPublish: path.join(s.art, s.files[1]) });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(new RegExp(`${s.files[1]} mudou depois da conferência`));
    expect(r.publishes.map((c) => path.basename(c.args[1]))).toEqual([s.files[0]]);
  });

  it("npm view com E500: para com 1 antes de qualquer publish", { timeout: 120_000 }, async () => {
    const r = await runStep(setup(), { view: { [NAMES[2]]: "E500" } });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/npm view falhou/);
    expect(r.publishes).toHaveLength(0);
  });

  it("2 de 5 já publicados: publica só os outros 3", { timeout: 120_000 }, async () => {
    const s = setup();
    const r = await runStep(s, { view: { [NAMES[0]]: "published", [NAMES[3]]: "published" } });
    expect(r.status).toBe(0);
    expect(r.publishes.map((c) => path.basename(c.args[1]))).toEqual([s.files[1], s.files[2], s.files[4]]);
  });

  it("artefato malicioso: recusado antes de qualquer view ou publish", { timeout: 120_000 }, async () => {
    const r = await runStep(setup({ replace: { 2: MALICIOUS["bloco nulo isolado"]() } }));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Artefato recusado/);
    expect(r.kinds.filter((k) => k === "view" || k === "publish")).toEqual([]);
  });
});

