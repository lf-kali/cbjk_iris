import { rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SiteConfigError } from "@cbjk_iris/schema";
import { configDiagnostics, loadSiteConfig, loadSiteConfigSync, SiteConfigLoadError } from "../src/project";
import { siteConfigFixture } from "./fixtures/site-config";
import { cleanupProjects, configSource, makeProject, writeFile } from "./helpers/project";

// LoadSiteConfig (SPEC §5.6): importa o site.config.ts num processo filho do Node (type stripping),
// a cada chamada, e valida com resolveSiteConfig.

afterEach(cleanupProjects);

function loadError(fn: () => unknown): SiteConfigLoadError {
  try {
    fn();
  } catch (error) {
    if (error instanceof SiteConfigLoadError) return error;
    throw error;
  }
  throw new Error("esperava SiteConfigLoadError");
}

describe("loadSiteConfig", () => {
  it("importa o site.config.ts e devolve o config resolvido (padrões preenchidos)", async () => {
    const root = makeProject();
    const config = await loadSiteConfig(root);
    expect(config.name).toBe("Loja");
    expect(config.modules).toEqual(["products", "services", "gallery"]);
    expect(config.texts.products.buttons.whatsapp).toBeTruthy();
  });

  it("relê o arquivo a cada chamada: a edição feita no mesmo processo aparece", () => {
    const root = makeProject();
    expect(loadSiteConfigSync(root).name).toBe("Loja");
    writeFile(root, "site.config.ts", configSource(siteConfigFixture({ name: "Outra" })));
    expect(loadSiteConfigSync(root).name).toBe("Outra");
  });

  it("config inválido: SiteConfigError com o caminho do campo", () => {
    const root = makeProject({ images: { remoteHosts: ["**"] } });
    expect(() => loadSiteConfigSync(root)).toThrow(SiteConfigError);
    expect(() => loadSiteConfigSync(root)).toThrow(/images\.remoteHosts\[0\]/);
  });

  it("sintaxe que o Node não apaga (enum): erro claro", () => {
    const root = makeProject(`enum Modo { A }\nexport const siteConfig = { name: Modo.A };\n`);
    const error = loadError(() => loadSiteConfigSync(root));
    expect(error.message).toMatch(/enum/);
    expect(error.diagnostics[0]).toMatchObject({ level: "error", file: "site.config.ts" });
  });

  it("sem export siteConfig: erro claro", () => {
    const root = makeProject(`export const config = {};\n`);
    expect(loadError(() => loadSiteConfigSync(root)).message).toMatch(/export const siteConfig/);
  });

  it("valor que não é dado (função): erro com o caminho", () => {
    const root = makeProject(`export const siteConfig = { name: "x", seo: { title: () => "t" } };\n`);
    const error = loadError(() => loadSiteConfigSync(root));
    expect(error.diagnostics[0].path).toBe("seo.title");
    expect(error.message).toMatch(/só dados/);
  });

  it("referência circular: erro, sem travar", () => {
    const root = makeProject(`const a: any = { name: "x" };\na.self = a;\nexport const siteConfig = a;\n`);
    expect(loadError(() => loadSiteConfigSync(root)).diagnostics[0].path).toBe("self");
  });

  it("erro lançado pelo próprio arquivo vira SiteConfigLoadError", () => {
    const root = makeProject(`throw new Error("quebrei de propósito");\nexport const siteConfig = {};\n`);
    expect(loadError(() => loadSiteConfigSync(root)).message).toMatch(/quebrei de propósito/);
  });

  it("arquivo que encerra o processo (process.exit): erro claro, sem JSON quebrado", () => {
    const root = makeProject(`console.error("saindo cedo");\nprocess.exit(3);\nexport const siteConfig = {};\n`);
    expect(loadError(() => loadSiteConfigSync(root)).message).toMatch(/encerrou sem ler o arquivo: saindo cedo/);
  });

  it("caracteres de controle e ANSI do processo filho não chegam ao diagnóstico", () => {
    const root = makeProject(`console.error("\\x1b[2J\\x1b[31mlimpa a tela\\u0007");\nprocess.exit(3);\nexport const siteConfig = {};\n`);
    const crashed = loadError(() => loadSiteConfigSync(root));
    expect(crashed.message).toMatch(/limpa a tela/);
    expect(crashed.message).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    const thrown = makeProject(`throw new Error("\\x1b]0;titulo\\u0007falhou\\u009b");\nexport const siteConfig = {};\n`);
    const error = loadError(() => loadSiteConfigSync(thrown));
    expect(error.message).toMatch(/falhou/);
    expect(error.diagnostics[0].message).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
  });

  it("console.log no config não atrapalha a leitura", () => {
    const root = makeProject(`console.log("{oi}");\nexport const siteConfig = ${JSON.stringify(siteConfigFixture())};\n`);
    expect(loadSiteConfigSync(root).name).toBe("Loja");
  });

  it("top-level await funciona (o filho usa import)", () => {
    const root = makeProject(`await Promise.resolve();\nexport const siteConfig = ${JSON.stringify(siteConfigFixture())};\n`);
    expect(loadSiteConfigSync(root).name).toBe("Loja");
  });

  it("site.config.ts ausente: erro que manda rodar na raiz do projeto", () => {
    const root = makeProject();
    rmSync(path.join(root, "site.config.ts"));
    expect(loadError(() => loadSiteConfigSync(root)).message).toMatch(/não encontrado/);
  });

  it("site.config.ts que é pasta: erro", () => {
    const root = makeProject();
    rmSync(path.join(root, "site.config.ts"));
    symlinkSync(root, path.join(root, "site.config.ts"));
    expect(() => loadSiteConfigSync(root)).toThrow(SiteConfigLoadError);
  });

  it("configDiagnostics converte os dois erros em Diagnostic", () => {
    const root = makeProject({ images: { remoteHosts: ["**"] } });
    let caught: unknown;
    try {
      loadSiteConfigSync(root);
    } catch (error) {
      caught = error;
    }
    const [d] = configDiagnostics(caught);
    expect(d).toMatchObject({ level: "error", file: "site.config.ts", path: "images.remoteHosts[0]" });
    const load = new SiteConfigLoadError([{ level: "error", file: "site.config.ts", message: "x" }]);
    expect(configDiagnostics(load)).toEqual(load.diagnostics);
    expect(() => configDiagnostics(new TypeError("bug"))).toThrow(TypeError);
  });
});
