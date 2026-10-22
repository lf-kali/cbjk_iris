import { existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { syncBrand } from "../src/codegen";
import { planBrand } from "../src/theme/sync-brand";
import { resolveSiteConfig, type SiteConfig } from "@cbjk_iris/schema";
import { siteConfigFixture } from "./fixtures/site-config";
import { GENERATED_HEADER } from "../src/codegen/files";
import { cleanupProjects, makeProject } from "./helpers/project";

// SyncBrand (SPEC §5.6): o ex-brand:sync. Gera app/fonts.generated.ts a partir de brand.fonts
// (ou da --font-sans do tema) e avisa de contraste baixo. Nada do config entra cru no código.

const OUT = "app/fonts.generated.ts";
afterEach(cleanupProjects);

const read = (root: string) => readFileSync(path.join(root, OUT), "utf8");
const errors = (r: ReturnType<typeof syncBrand>) => r.diagnostics.filter((d) => d.level === "error");

describe("syncBrand", () => {
  it("sem brand.fonts, usa a fonte do tema (Geist no taupe), igual ao arquivo de hoje", () => {
    const root = makeProject({ theme: { name: "taupe", colorMode: "system" } });
    const result = syncBrand(root, { check: false });
    expect(errors(result)).toEqual([]);
    expect(result.changed).toEqual([OUT]);
    const text = read(root);
    expect(text.startsWith(`${GENERATED_HEADER}\n`)).toBe(true);
    expect(text).toContain(`import { Geist } from "next/font/google";`);
    expect(text).toContain(`const sans = Geist({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });`);
    expect(text).toContain(`export const fontClassName = [sans.variable].join(" ");`);
    expect(syncBrand(root, { check: true })).toMatchObject({ changed: [], upToDate: true });
  });

  it("fonte do Google com pesos e fonte local, com valores em JSON", () => {
    const root = makeProject(
      {
        brand: {
          colors: {},
          fonts: {
            sans: { google: "Playfair Display", weights: ["400", "700"] },
            heading: { local: [{ path: "fonts/marca.woff2", weight: "700" }] },
          },
        },
      },
      { "fonts/marca.woff2": "x" },
    );
    const result = syncBrand(root, { check: false });
    expect(errors(result)).toEqual([]);
    const text = read(root);
    expect(text).toContain(`Playfair_Display({ subsets: ["latin"], weight: ["400","700"], variable: "--font-brand-sans", display: "swap" })`);
    expect(text).toContain(`import localFont from "next/font/local";`);
    expect(text).toContain(`{ path: "../fonts/marca.woff2", weight: "700", style: "normal" },`);
  });

  it("fonte que não existe no Google (inclusive 'constructor'): erro com caminho e nada gerado", () => {
    for (const google of ["Fonte Que Nao Existe", "constructor"]) {
      const root = makeProject({ brand: { colors: {}, fonts: { sans: { google } } } });
      const result = syncBrand(root, { check: false });
      expect(errors(result)[0]).toMatchObject({ file: "site.config.ts", path: "brand.fonts.sans.google" });
      expect(result.upToDate).toBe(false);
      expect(existsSync(path.join(root, OUT))).toBe(false);
    }
  });

  it("peso que a fonte não tem e arquivo local ausente: erros", () => {
    const root = makeProject({
      brand: {
        colors: {},
        fonts: { sans: { google: "Geist", weights: ["950"] }, heading: { local: [{ path: "fonts/x.woff2", weight: "400" }] } },
      },
    });
    const paths = errors(syncBrand(root, { check: false })).map((d) => d.path);
    expect(paths).toEqual(["brand.fonts.sans.weights", "brand.fonts.heading.local[0].path"]);
  });

  it('cor da marca que o motor não entende ("#"): erro com o caminho, sem lançar', () => {
    const root = makeProject({ brand: { colors: { primary: "#" } } });
    const result = syncBrand(root, { check: false });
    expect(errors(result)).toEqual([expect.objectContaining({ path: "brand.colors.primary" })]);
    expect(existsSync(path.join(root, OUT))).toBe(false);
  });

  it("tema inexistente: erro em theme.name", () => {
    const root = makeProject({ theme: { name: "nao-existe", colorMode: "system" } });
    expect(errors(syncBrand(root, { check: false }))[0]).toMatchObject({ path: "theme.name" });
  });

  it("tema do projeto (themes/) tem prioridade e é lido da raiz do projeto, não do cwd", () => {
    const css = readFileSync(fileURLToPath(new URL("../themes/neutral.css", import.meta.url)), "utf8").replace("Geist, sans-serif", "Inter, sans-serif");
    const root = makeProject({ theme: { name: "neutral", colorMode: "system" } }, { "themes/neutral.css": css });
    syncBrand(root, { check: false });
    expect(read(root)).toContain("Inter({");
  });

  it("estilo sem preset ainda (glass): aviso", () => {
    const root = makeProject({ theme: { name: "neutral", colorMode: "system", style: "glass" } });
    const result = syncBrand(root, { check: false });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ level: "warning", path: "theme.style" }));
  });

  it("contraste baixo vira aviso, não erro", () => {
    const root = makeProject({ brand: { colors: { cta: "#777777" } } });
    const result = syncBrand(root, { check: false });
    expect(errors(result)).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ level: "warning", path: "brand.colors" }));
  });

  it("--check: arquivo desatualizado aparece em changed e não é escrito", () => {
    const root = makeProject({}, { [OUT]: `${GENERATED_HEADER}\nvelho\n` });
    const result = syncBrand(root, { check: true });
    expect(result).toMatchObject({ changed: [OUT], upToDate: false });
    expect(read(root)).toBe(`${GENERATED_HEADER}\nvelho\n`);
  });

  it("arquivo sem o cabeçalho no caminho gerado: erro, não sobrescreve", () => {
    const root = makeProject({}, { [OUT]: "// escrito à mão\n" });
    const result = syncBrand(root, { check: false });
    expect(errors(result)[0]).toMatchObject({ file: OUT });
    expect(read(root)).toBe("// escrito à mão\n");
  });

  it("app/ como link simbólico: erro, nada escrito fora do projeto", () => {
    const root = makeProject();
    const outside = makeProject();
    mkdirSync(path.join(outside, "alvo"));
    symlinkSync(path.join(outside, "alvo"), path.join(root, "app"));
    const result = syncBrand(root, { check: false });
    expect(errors(result)[0]).toMatchObject({ file: "app" });
    expect(existsSync(path.join(outside, "alvo/fonts.generated.ts"))).toBe(false);
  });

  it("fonte local com caminho fora do projeto é recusada (schema) antes de gerar código", () => {
    const root = makeProject({ brand: { colors: {}, fonts: { sans: { local: [{ path: "../../x.woff2", weight: "400" }] } } } });
    const result = syncBrand(root, { check: false });
    expect(errors(result)[0]).toMatchObject({ file: "site.config.ts", path: "brand.fonts.sans.local[0].path" });
    expect(existsSync(path.join(root, OUT))).toBe(false);
  });

  it("nome de papel ou de função que não é identificador TS não entra no código gerado", () => {
    // font-data.json falso no node_modules do projeto: o createRequire do projeto o acha primeiro
    const fontData = JSON.stringify({ Geist: { weights: ["400", "700"] }, "1 Fonte": { weights: ["400"] } });
    const root = makeProject({}, { "node_modules/next/dist/compiled/@next/font/dist/google/font-data.json": fontData });
    const base = resolveSiteConfig(siteConfigFixture());
    const withFonts = (fonts: Record<string, unknown>) => ({ ...base, brand: { ...base.brand, fonts } }) as unknown as SiteConfig;

    const badFn = planBrand(root, withFonts({ sans: { google: "1 Fonte" } }));
    expect(badFn.files.size).toBe(0);
    expect(badFn.diagnostics).toContainEqual(expect.objectContaining({ level: "error", path: "brand.fonts.sans.google" }));

    const badRole = planBrand(root, withFonts({ "x-y": { google: "Geist" } }));
    expect(badRole.files.size).toBe(0);
    expect(badRole.diagnostics).toContainEqual(expect.objectContaining({ level: "error", path: "brand.fonts" }));
  });

  it("config inválido: diagnostics do site.config.ts, nada gerado", () => {
    const root = makeProject({ images: { remoteHosts: ["**"] } });
    const result = syncBrand(root, { check: false });
    expect(errors(result)[0]).toMatchObject({ file: "site.config.ts", path: "images.remoteHosts[0]" });
    expect(existsSync(path.join(root, OUT))).toBe(false);
  });
});
