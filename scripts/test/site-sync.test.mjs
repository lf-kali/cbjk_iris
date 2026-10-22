import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// apps/site/scripts/sync.mjs (predev, prebuild, sync, sync:check): chama o Sync do engine e traduz o
// SyncResult em mensagens e código de saída. Requer os pacotes compilados (npm run build:packages).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "apps/site/scripts/sync.mjs");
const dirs = [];

const base = {
  name: "Loja",
  locale: "pt-BR",
  currency: "BRL",
  brand: { colors: {} },
  seo: { title: "Loja", titleTemplate: "%s | Loja" },
  whatsapp: { phone: "5511999999999", messages: { general: "Oi", product: "Oi", service: "Oi" } },
  images: { remoteHosts: [] },
  theme: { name: "neutral", colorMode: "system" },
  menu: [],
};

function project(config) {
  // dentro de apps/ (padrão apps/.* no .gitignore), para achar o node_modules da raiz
  const dir = mkdtempSync(path.join(ROOT, "apps", ".site-sync-test-"));
  dirs.push(dir);
  writeFileSync(path.join(dir, "package.json"), '{ "name": "site-sync-test", "private": true, "type": "module" }\n');
  writeFileSync(path.join(dir, "site.config.ts"), `export const siteConfig = ${JSON.stringify(config, null, 2)};\n`);
  return dir;
}

function run(cwd, script = SCRIPT, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("apps/site/scripts/sync.mjs", () => {
  it("gera os arquivos e, com --check, sai com 0 quando está em dia", () => {
    const dir = project(base);
    expect(run(dir).code).toBe(0);
    expect(existsSync(path.join(dir, "app/(iris)/produtos/page.tsx"))).toBe(true);
    expect(run(dir, SCRIPT, ["--check"])).toMatchObject({ code: 0 });
  });

  it("--check com arquivo desatualizado: sai com 1 e manda rodar o sync", () => {
    const dir = project(base);
    run(dir);
    const file = path.join(dir, "app/(iris)/produtos/page.tsx");
    writeFileSync(file, readFileSync(file, "utf8") + " ");
    const { code, out } = run(dir, SCRIPT, ["--check"]);
    expect(code).toBe(1);
    expect(out).toMatch(/app\/\(iris\)\/produtos\/page\.tsx/);
    expect(out).toMatch(/npm run sync/);
  });

  it("config inválido: sai com 1, mensagem com o caminho do campo, nada gerado", () => {
    const dir = project({ ...base, images: { remoteHosts: ["**"] } });
    const { code, out } = run(dir);
    expect(code).toBe(1);
    expect(out).toMatch(/site\.config\.ts → images\.remoteHosts\[0\]/);
    expect(existsSync(path.join(dir, "app"))).toBe(false);
  });

  it("aviso não muda o código de saída", () => {
    const dir = project({ ...base, theme: { ...base.theme, style: "glass" } });
    const { code, out } = run(dir);
    expect(code).toBe(0);
    expect(out).toMatch(/aviso: site\.config\.ts → theme\.style/);
  });

  it("sem os pacotes compilados: manda rodar npm run build:packages", () => {
    // cópia do script fora do monorepo: o import de @cbjk_iris/engine não resolve
    const outside = mkdtempSync(path.join(os.tmpdir(), "iris-site-sync-"));
    dirs.push(outside);
    mkdirSync(path.join(outside, "scripts"));
    copyFileSync(SCRIPT, path.join(outside, "scripts/sync.mjs"));
    const { code, out } = run(outside, path.join(outside, "scripts/sync.mjs"));
    expect(code).toBe(1);
    expect(out).toMatch(/npm run build:packages/);
  });

  // engine falso num node_modules fora do monorepo: testa o tratamento de erro do script
  function withFakeEngine(indexSource) {
    const outside = mkdtempSync(path.join(os.tmpdir(), "iris-site-sync-fake-"));
    dirs.push(outside);
    const pkg = path.join(outside, "node_modules/@cbjk_iris/engine");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, "package.json"), '{ "name": "@cbjk_iris/engine", "type": "module", "exports": "./index.mjs" }');
    writeFileSync(path.join(pkg, "index.mjs"), indexSource);
    mkdirSync(path.join(outside, "scripts"));
    copyFileSync(SCRIPT, path.join(outside, "scripts/sync.mjs"));
    return outside;
  }

  it("módulo ausente que não é do Iris: mostra a mensagem original, sem stack e sem falar de build:packages", () => {
    const dir = withFakeEngine('import "pacote-que-nao-existe-xyz";\nexport const sync = () => ({});\n');
    const { code, out } = run(dir, path.join(dir, "scripts/sync.mjs"));
    expect(code).toBe(1);
    expect(out).toMatch(/pacote-que-nao-existe-xyz/);
    expect(out).not.toMatch(/build:packages/);
    expect(out).not.toMatch(/^\s+at /m);
  });

  it("erro inesperado: mensagem curta e exit 1; o stack só com --verbose", () => {
    const dir = withFakeEngine('export const sync = () => { throw new Error("quebrou por dentro"); };\nexport const formatDiagnostic = String;\n');
    const script = path.join(dir, "scripts/sync.mjs");
    const quiet = run(dir, script);
    expect(quiet.code).toBe(1);
    expect(quiet.out).toMatch(/erro inesperado: quebrou por dentro/);
    expect(quiet.out).not.toMatch(/^\s+at /m);
    const verbose = run(dir, script, ["--verbose"]);
    expect(verbose.code).toBe(1);
    expect(verbose.out).toMatch(/^\s+at /m);
  });
});
