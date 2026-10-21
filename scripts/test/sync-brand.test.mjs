import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// apps/site/scripts/sync-brand.mjs (ex-brand:sync; vira SyncBrand na E6). Roda no predev/prebuild,
// antes do next.config: precisa validar o config sozinho e gerar código sem interpolar texto cru.
// Requer os pacotes compilados (npm run build:packages), como o próprio script.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SCRIPT = path.join(ROOT, "apps/site/scripts/sync-brand.mjs");
// dentro de apps/ (padrão apps/.* no .gitignore), para achar o node_modules da raiz
const DIR = path.join(ROOT, "apps/.sync-brand-test");
const OUT = path.join(DIR, "app/fonts.generated.ts");

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

function run(config, files = {}) {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(path.join(DIR, "app"), { recursive: true });
  writeFileSync(path.join(DIR, "package.json"), '{ "name": "sync-brand-test", "private": true, "type": "module" }\n');
  writeFileSync(path.join(DIR, "site.config.ts"), `export const siteConfig = ${JSON.stringify(config, null, 2)};\n`);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(DIR, rel)), { recursive: true });
    writeFileSync(path.join(DIR, rel), content);
  }
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", SCRIPT], { cwd: DIR, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

afterEach(() => rmSync(DIR, { recursive: true, force: true }));

describe("sync-brand.mjs", () => {
  it("config inválido: falha com a mensagem pt-BR do resolveSiteConfig e não gera nada", () => {
    const { code, out } = run({ ...base, images: { remoteHosts: ["**"] } });
    expect(code).toBe(1);
    expect(out).toMatch(/site\.config\.ts tem erros:/);
    expect(out).toMatch(/images\.remoteHosts\[0\]/);
    expect(existsSync(OUT)).toBe(false);
  });

  it("fonte local com caminho fora do projeto é recusada antes de gerar código", () => {
    const { code, out } = run({ ...base, brand: { colors: {}, fonts: { sans: { local: [{ path: "../../x.woff2", weight: "400" }] } } } });
    expect(code).toBe(1);
    expect(out).toMatch(/brand\.fonts\.sans\.local\[0\]\.path/);
    expect(existsSync(OUT)).toBe(false);
  });

  it('nome de fonte igual a uma chave de Object.prototype ("constructor") dá erro claro, não TypeError', () => {
    const { code, out } = run({ ...base, brand: { colors: {}, fonts: { sans: { google: "constructor" } } } });
    expect(code).toBe(1);
    expect(out).toMatch(/"constructor" não existe no Google Fonts/);
    expect(out).not.toMatch(/TypeError/);
  });

  it("fonte local válida: gera o código com os valores em JSON", () => {
    const { code, out } = run(
      { ...base, brand: { colors: {}, fonts: { sans: { local: [{ path: "fonts/marca.woff2", weight: "100 900", style: "italic" }] } } } },
      { "fonts/marca.woff2": "x" },
    );
    expect(code, out).toBe(0);
    expect(readFileSync(OUT, "utf8")).toContain('{ path: "../fonts/marca.woff2", weight: "100 900", style: "italic" }');
  });
});
