import { existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MODULES } from "@cbjk_iris/schema";
import { ROUTE_PAGES, sync, syncRegistry, syncRoutes } from "../src/codegen";
import { GENERATED_HEADER } from "../src/codegen/files";
import { cleanupProjects, makeProject, writeFile } from "./helpers/project";

// SyncRegistry, SyncRoutes e Sync (SPEC §5.1.3 e §5.6).

const REGISTRY = "app/iris.registry.generated.tsx";
const LAYOUT = "app/layout.tsx";
const route = (r: string) => `app/(iris)/${r ? `${r}/` : ""}page.tsx`;
const ALL_ROUTES = ["", "[slug]", "produtos", "produto/[slug]", "servicos", "servico/[slug]", "ultimos-projetos"];

afterEach(cleanupProjects);

const read = (root: string, rel: string) => readFileSync(path.join(root, rel), "utf8");
const errors = (r: { diagnostics: { level: string }[] }) => r.diagnostics.filter((d) => d.level === "error");

describe("syncRegistry", () => {
  it("todos os módulos: seções do núcleo e depois as dos módulos, na ordem de MODULES", () => {
    const root = makeProject({ modules: ["gallery", "products", "services"] });
    const result = syncRegistry(root, { check: false });
    expect(result).toMatchObject({ changed: [REGISTRY], diagnostics: [] });
    const text = read(root, REGISTRY);
    expect(text.startsWith(`${GENERATED_HEADER}\n`)).toBe(true);
    const types = [...text.matchAll(/^ {2}"([a-z-]+)": /gm)].map((m) => m[1]);
    expect(types).toEqual([
      "hero", "benefits", "text-image", "cta-banner", "testimonials", "stats", "faq", "contact", "lead-form", "widget",
      "products", "services", "gallery",
    ]);
    expect(text).toContain(`import TextImageSection from "@cbjk_iris/core/sections/text-image";`);
    expect(text).toContain(`import type { SectionRegistry } from "@cbjk_iris/schema";`);
  });

  it("módulo desligado sai do registro", () => {
    const root = makeProject({ modules: ["products"] });
    syncRegistry(root, { check: false });
    const text = read(root, REGISTRY);
    expect(text).toContain('"products"');
    expect(text).not.toMatch(/gallery|services/);
  });

  it("--check não grava", () => {
    const root = makeProject();
    expect(syncRegistry(root, { check: true })).toMatchObject({ changed: [REGISTRY], upToDate: false });
    expect(existsSync(path.join(root, REGISTRY))).toBe(false);
  });
});

describe("syncRoutes", () => {
  it("gera o layout e as 7 rotas finas; [slug] com dynamicParams = false literal", () => {
    const root = makeProject();
    const result = syncRoutes(root, { check: false });
    expect(errors(result)).toEqual([]);
    expect(result.changed.sort()).toEqual([LAYOUT, ...ALL_ROUTES.map(route)].sort());
    for (const r of ALL_ROUTES) {
      const text = read(root, route(r));
      expect(text.startsWith(`${GENERATED_HEADER}\n`)).toBe(true);
      expect(/^export const dynamicParams = false;$/m.test(text)).toBe(r.endsWith("[slug]"));
    }
    expect(read(root, route("produto/[slug]"))).toContain(
      `export { default, generateStaticParams, generateMetadata } from "@cbjk_iris/core/app/products/detail";`,
    );
    expect(read(root, route("produtos"))).toContain(`export { default, metadata } from "@cbjk_iris/core/app/products/list";`);
    expect(read(root, route(""))).toContain(`export { default } from "@cbjk_iris/core/app/home";`);
    const layout = read(root, LAYOUT);
    expect(layout).toContain(`import "./globals.css";`);
    expect(layout).toContain(`<IrisRootLayout fontClassName={fontClassName}>{children}</IrisRootLayout>`);
    expect(syncRoutes(root, { check: true })).toMatchObject({ changed: [], upToDate: true });
  });

  it("módulo desligado: as rotas geradas dele são apagadas, com as pastas vazias", () => {
    const root = makeProject();
    syncRoutes(root, { check: false });
    writeFile(root, "site.config.ts", read(root, "site.config.ts").replace('"menu": []', '"menu": [], "modules": ["services"]'));
    const result = syncRoutes(root, { check: false });
    expect(result.changed.sort()).toEqual(
      [route("produtos"), route("produto/[slug]"), route("ultimos-projetos")].sort(),
    );
    expect(existsSync(path.join(root, "app/(iris)/produto"))).toBe(false);
    expect(existsSync(path.join(root, "app/(iris)/ultimos-projetos"))).toBe(false);
    expect(existsSync(path.join(root, route("servicos")))).toBe(true);
  });

  it("arquivo escrito à mão num caminho gerado: erro e nada é escrito", () => {
    const root = makeProject({}, { [route("produtos")]: "// à mão\nexport default function P() { return null; }\n" });
    const result = syncRoutes(root, { check: false });
    expect(errors(result)).toEqual([expect.objectContaining({ file: route("produtos"), hint: expect.stringMatching(/apague/) })]);
    expect(read(root, route("produtos"))).toMatch(/^\/\/ à mão/);
    expect(existsSync(path.join(root, LAYOUT))).toBe(false);
  });

  it("arquivo à mão em rota de módulo desligado: aviso, não apaga", () => {
    const root = makeProject({ modules: [] }, { [route("ultimos-projetos")]: "// à mão\n" });
    const result = syncRoutes(root, { check: false });
    expect(errors(result)).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ level: "warning", file: route("ultimos-projetos") }));
    expect(existsSync(path.join(root, route("ultimos-projetos")))).toBe(true);
  });

  it("app/(iris) como link simbólico: erro, nada escrito fora", () => {
    const root = makeProject();
    const outside = makeProject();
    mkdirSync(path.join(root, "app"));
    symlinkSync(outside, path.join(root, "app/(iris)"));
    const result = syncRoutes(root, { check: false });
    expect(errors(result)[0]).toMatchObject({ file: "app/(iris)" });
    // um diagnóstico só, não um por rota que passa pelo link
    expect(errors(result)).toHaveLength(1);
    expect(existsSync(path.join(outside, "page.tsx"))).toBe(false);
  });

  it("ROUTE_PAGES cobre as rotas do núcleo e as de cada módulo de MODULES", () => {
    const fromModules = MODULES.flatMap((m) => m.routes.map((r) => `${m.id}:${r}`));
    const fromTable = ROUTE_PAGES.filter((p) => p.module !== "core").map((p) => `${p.module}:${p.route}`);
    expect(fromTable.sort()).toEqual([...fromModules].sort());
    expect(ROUTE_PAGES.filter((p) => p.module === "core").map((p) => p.route)).toEqual(["", "[slug]"]);
  });
});

describe("sync", () => {
  it("gera fontes, registro e rotas; na segunda vez está em dia", () => {
    const root = makeProject();
    const first = sync(root, { check: false });
    expect(errors(first)).toEqual([]);
    expect(first.changed).toContain("app/fonts.generated.ts");
    expect(first.changed).toContain(REGISTRY);
    expect(first.changed).toContain(LAYOUT);
    expect(sync(root, { check: true })).toMatchObject({ changed: [], upToDate: true });
  });

  it("--check falha com um arquivo desatualizado e não o corrige", () => {
    const root = makeProject();
    sync(root, { check: false });
    const file = path.join(root, route("produtos"));
    writeFile(root, route("produtos"), read(root, route("produtos")).replace("metadata", "metadata "));
    const result = sync(root, { check: true });
    expect(result).toMatchObject({ changed: [route("produtos")], upToDate: false });
    expect(readFileSync(file, "utf8")).toContain("metadata ");
  });

  it("erro no plano: um erro de fonte impede a escrita do registro e das rotas", () => {
    const root = makeProject({ brand: { colors: {}, fonts: { sans: { google: "Nao Existe" } } } });
    const result = sync(root, { check: false });
    expect(errors(result)).toHaveLength(1);
    expect(result.upToDate).toBe(false);
    expect(existsSync(path.join(root, REGISTRY))).toBe(false);
    expect(existsSync(path.join(root, LAYOUT))).toBe(false);
  });

  it("config que não carrega: diagnostic do site.config.ts, sem lançar", () => {
    const root = makeProject(`enum E { A }\nexport const siteConfig = {};\n`);
    const result = sync(root, { check: true });
    expect(errors(result)[0]).toMatchObject({ file: "site.config.ts" });
    expect(result.upToDate).toBe(false);
  });
});
