import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// apps/site/scripts/theme-add.mjs (npm run theme:add): chama importTheme + writeThemeFile do engine.
// Só os caminhos que falham antes da rede: nenhum teste vai à internet.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "apps/site/scripts/theme-add.mjs");
const dirs = [];

function project() {
  const dir = mkdtempSync(path.join(ROOT, "apps", ".theme-add-test-"));
  dirs.push(dir);
  return dir;
}

function run(cwd, args, script = SCRIPT) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("apps/site/scripts/theme-add.mjs", () => {
  it("sem argumento: mostra o uso e sai com 1", () => {
    const { code, out } = run(project(), []);
    expect(code).toBe(1);
    expect(out).toMatch(/Uso: npm run theme:add/);
  });

  it("http: é recusado antes de baixar", () => {
    const dir = project();
    const { code, out } = run(dir, ["http://tweakcn.com/r/themes/x.json"]);
    expect(code).toBe(1);
    expect(out).toMatch(/só https/);
    expect(existsSync(path.join(dir, "themes"))).toBe(false);
  });

  it("--as com .. é recusado antes de baixar", () => {
    const dir = project();
    const { code, out } = run(dir, ["ocean-breeze", "--as", "../fora"]);
    expect(code).toBe(1);
    expect(out).toMatch(/nome inválido/);
    expect(existsSync(path.join(dir, "themes"))).toBe(false);
  });

  it("sem os pacotes compilados: manda rodar npm run build:packages", () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), "iris-theme-add-"));
    dirs.push(outside);
    mkdirSync(path.join(outside, "scripts"));
    copyFileSync(SCRIPT, path.join(outside, "scripts/theme-add.mjs"));
    const { code, out } = run(outside, ["ocean-breeze"], path.join(outside, "scripts/theme-add.mjs"));
    expect(code).toBe(1);
    expect(out).toMatch(/npm run build:packages/);
  });
});
