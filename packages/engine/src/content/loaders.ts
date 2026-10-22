// Loaders de content/ (SPEC §5.3): validam cada arquivo com os schemas do @cbjk_iris/schema e param
// o build com a lista de erros. Leem de novo a cada chamada (sem cache), para o next dev mostrar a
// edição ao recarregar a página. Só rodam no servidor: usam fs e zod.
import path from "node:path";
import {
  formatIssuePath,
  getSectionDefinition,
  homeSchema,
  MODULE_IDS,
  pageSchema,
  pageSlugSchema,
  productContentSchema,
  ptBRError,
  serviceContentSchema,
  type Diagnostic,
  type Home,
  type ModuleId,
  type Page,
  type Product,
  type Section,
  type Service,
} from "@cbjk_iris/schema";
import type { z } from "zod";
import { ContentError, contentDiagnostic } from "./errors";
import { contentContext, listContentDir, readContentJson, relPath, type ContentContext, type ContentFile } from "./read";

export interface ContentOptions {
  /** raiz do projeto; padrão: process.cwd() */
  root?: string;
}

export interface SectionContentOptions extends ContentOptions {
  /** módulos ativos (siteConfig.modules). Seção de módulo fora da lista é erro */
  modules: readonly ModuleId[];
}

export type LoadedPage = Page & { slug: string };

type Validated<T> = { ok: true; data: T } | { ok: false; diagnostics: Diagnostic[] };

function validate<S extends z.ZodType>(schema: S, data: unknown, file: string): Validated<z.output<S>> {
  const result = schema.safeParse(data, { error: ptBRError });
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    diagnostics: result.error.issues.map((issue) => contentDiagnostic(file, issue.message, { path: formatIssuePath(issue.path) })),
  };
}

/** Seção de um módulo desligado: erro com as duas saídas (ligar o módulo ou remover a seção). */
function disabledModuleSections(sections: readonly Section[], modules: readonly ModuleId[], file: string): Diagnostic[] {
  return sections.flatMap((section, i) => {
    const { module } = getSectionDefinition(section.type);
    if (module === "core" || modules.includes(module)) return [];
    return [
      contentDiagnostic(
        file,
        `a seção "${section.type}" é do módulo "${module}", que está desligado. Ligue o módulo (iris module add ${module}, ou acrescente "${module}" em modules no site.config.ts) ou remova a seção.`,
        { path: `sections[${i}]`, hint: `iris module add ${module}` },
      ),
    ];
  });
}

function readValidated<S extends z.ZodType>(ctx: ContentContext, abs: string, schema: S): Validated<z.output<S>> | null {
  const read = readContentJson(ctx, abs);
  if (read.status === "missing") return null;
  if (read.status === "error") return { ok: false, diagnostics: read.diagnostics };
  return validate(schema, read.data, relPath(ctx, abs));
}

// opts.modules vem do código do chamador (siteConfig.modules): sem ele, a checagem de módulo desligado
// não tem como funcionar. Erro claro em vez de um TypeError.
function assertModules(opts: SectionContentOptions, fn: string) {
  const modules: unknown = opts?.modules;
  if (!Array.isArray(modules) || !modules.every((m) => (MODULE_IDS as readonly unknown[]).includes(m))) {
    throw new ContentError([
      contentDiagnostic(
        "content",
        `${fn} precisa de opts.modules, a lista de módulos ativos (siteConfig.modules), com ids de ${MODULE_IDS.join(", ")}`,
      ),
    ]);
  }
}

function throwIfAny(diagnostics: Diagnostic[]) {
  if (diagnostics.length) throw new ContentError(diagnostics);
}

// order crescente; sem order no fim; empate pelo slug (ordem de code unit, sem depender do locale)
function byOrderThenSlug(a: { order?: number; slug: string }, b: { order?: number; slug: string }): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

function loadCatalog<S extends z.ZodType, K extends string>(
  opts: ContentOptions,
  sub: string,
  schema: S,
  kind: K,
): (z.output<S> & { kind: K; slug: string })[] {
  const ctx = contentContext(opts.root);
  const { files, diagnostics } = listContentDir(ctx, sub);
  const items = files.flatMap((file: ContentFile) => {
    const result = readValidated(ctx, file.abs, schema);
    if (!result) return [];
    if (!result.ok) {
      diagnostics.push(...result.diagnostics);
      return [];
    }
    return [{ ...(result.data as object), kind, slug: file.slug } as z.output<S> & { kind: K; slug: string }];
  });
  throwIfAny(diagnostics);
  return items.sort(byOrderThenSlug);
}

/** content/products/<slug>.json, validados e ordenados. Pasta ausente = []. */
export async function loadProducts(opts: ContentOptions = {}): Promise<Product[]> {
  return loadCatalog(opts, "products", productContentSchema, "product") as Product[];
}

/** content/services/<slug>.json, validados e ordenados. Pasta ausente = []. */
export async function loadServices(opts: ContentOptions = {}): Promise<Service[]> {
  return loadCatalog(opts, "services", serviceContentSchema, "service") as Service[];
}

/** content/home.json. Ausente = { sections: [] }. */
export async function loadHome(opts: SectionContentOptions): Promise<Home> {
  assertModules(opts, "loadHome");
  const ctx = contentContext(opts.root);
  const abs = path.join(ctx.root, "content", "home.json");
  const result = readValidated(ctx, abs, homeSchema);
  if (!result) return { sections: [] };
  if (!result.ok) throw new ContentError(result.diagnostics);
  throwIfAny(disabledModuleSections(result.data.sections, opts.modules, relPath(ctx, abs)));
  return result.data;
}

function loadPageFile(ctx: ContentContext, file: ContentFile, modules: readonly ModuleId[]): Validated<LoadedPage> | null {
  if (!pageSlugSchema.safeParse(file.slug).success) {
    return { ok: false, diagnostics: [contentDiagnostic(file.rel, `"${file.slug}" é um slug reservado (rota do site): renomeie o arquivo`)] };
  }
  const result = readValidated(ctx, file.abs, pageSchema);
  if (!result || !result.ok) return result;
  const disabled = disabledModuleSections(result.data.sections, modules, file.rel);
  if (disabled.length) return { ok: false, diagnostics: disabled };
  return { ok: true, data: { ...result.data, slug: file.slug } };
}

/** content/pages/<slug>.json, validadas e ordenadas pelo slug. Pasta ausente = []. */
export async function loadPages(opts: SectionContentOptions): Promise<LoadedPage[]> {
  assertModules(opts, "loadPages");
  const ctx = contentContext(opts.root);
  const { files, diagnostics } = listContentDir(ctx, "pages");
  const pages = files.flatMap((file) => {
    const result = loadPageFile(ctx, file, opts.modules);
    if (!result) return [];
    if (!result.ok) {
      diagnostics.push(...result.diagnostics);
      return [];
    }
    return [result.data];
  });
  throwIfAny(diagnostics);
  return pages;
}

/**
 * Uma página. Slug inválido ou reservado devolve undefined sem tocar no disco (o slug pode vir da URL);
 * arquivo ausente também. Arquivo inválido lança ContentError.
 */
export async function loadPage(slug: string, opts: SectionContentOptions): Promise<LoadedPage | undefined> {
  assertModules(opts, "loadPage");
  if (!pageSlugSchema.safeParse(slug).success) return undefined;
  const ctx = contentContext(opts.root);
  const dir = listContentDir(ctx, "pages");
  const file = dir.files.find((f) => f.slug === slug);
  // problema da pasta, ou do próprio <slug>.json (link, FIFO, subpasta com esse nome): erro, não undefined
  const problem = dir.diagnostics.find((d) => d.file === "content/pages" || d.file === `content/pages/${slug}.json`);
  if (problem) throw new ContentError([problem]);
  if (!file) return undefined;
  const result = loadPageFile(ctx, file, opts.modules);
  if (!result) return undefined;
  if (!result.ok) throw new ContentError(result.diagnostics);
  return result.data;
}
