import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as root from "../src/index";
import * as defaults from "../src/defaults";

// Lista fechada do que o pacote publica (SPEC §5.6, "Exports do @cbjk_iris/schema").
// Mudou um nome aqui? É mudança de contrato: atualize a spec no mesmo PR (e, depois da tag, ADR).

const ROOT_VALUES = [
  "COLOR_TOKENS", "DEFAULT_BUTTON_ORDER", "DEFAULT_MODULES", "DEFAULT_STYLE_ID", "DEFAULT_TEXTS", "EXIT_CODES",
  "FROZEN_UTILITIES", "IRIS_STYLE_VAR", "MODULES", "MODULE_IDS", "PLATFORM_HOSTS", "PURCHASE_PLATFORMS",
  "RESERVED_PAGE_SLUGS", "SECTION_ICONS", "SECTION_TYPES", "SHAPE_TOKENS", "SHAPE_TOKEN_KEYS", "STYLE_IDS",
  "SiteConfigError", "applySiteConfigDefaults", "catalogItemBase", "cliResultSchema", "defineSection", "fieldAsk",
  "fieldMeta", "fieldMetaSchema", "formatIssuePath", "getSectionDefinition", "homeSchema", "httpsUrl",
  "installmentSchema", "pageSchema", "pageSlugSchema", "platformUrl", "productContentSchema", "productSchema",
  "ptBRError", "resolveSiteConfig", "resolveTexts", "sectionBase", "sectionDefinitions", "sectionSchema",
  "sectionsOfModule", "serviceContentSchema", "serviceSchema", "siteConfigSchema", "slugSchema",
];

const ROOT_TYPES = [
  // §5.2
  "CatalogItem", "Installment", "MarketplacePlatform", "Product", "ProductFilter", "ProductInput", "PurchaseButton",
  "PurchaseButtonTexts", "PurchaseContext", "PurchasePlatform", "ResolvePurchaseButtons", "Service", "ServiceInput", "Spec",
  // §5.3
  "BrandColors", "BrandConfig", "BrandFont", "ColorMode", "ColorToken", "ColorTokens", "CommerceConfig", "ContactInfo",
  "DeepPartial", "FooterConfig", "Home", "LeadsConfig", "MenuItem", "Page", "SiteConfig", "SiteConfigInput",
  "SiteLink", "SiteLogo", "SiteTexts", "SocialNetwork",
  // §5.4
  "ShapeTokenKey", "ShapeTokenName", "ShapeTokenSpec", "ShapeTokens", "StyleId",
  // §5.5
  "BenefitsSection", "ContactSection", "CtaBannerSection", "FaqSection", "FieldMeta", "GallerySection", "HeroSection",
  "HeroSlide", "LeadField", "LeadFormSection", "ModuleId", "ProductsSection", "Section", "SectionComponent",
  "SectionDefinition", "SectionIcon", "SectionInput", "SectionLimits", "SectionModule", "SectionOf", "SectionPreset",
  "SectionRegistry", "SectionType", "ServicesSection", "StatsSection", "TestimonialsSection", "TextImageSection",
  "WidgetSection",
  // §5.6
  "CheckContent", "Diagnostic", "FileChange", "ImportTheme", "ImportThemeSource", "ListStyles", "ListThemes",
  "LoadSiteConfig", "RemoveModuleContent", "StyleInfo", "Sync", "SyncBrand", "SyncRegistry", "SyncResult", "SyncRoutes",
  "ThemeInfo", "ValidateTheme",
  // §5.7
  "CliError", "CliErrorCode", "CliResult",
];

const DEFAULTS_VALUES = ["DEFAULT_BUTTON_ORDER", "DEFAULT_MODULES", "DEFAULT_TEXTS", "applySiteConfigDefaults", "resolveTexts"];
const DEFAULTS_TYPES = ["DeepPartial", "ModuleId", "PurchaseButtonTexts", "PurchasePlatform", "SiteConfig", "SiteConfigInput", "SiteTexts"];

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

// nomes exportados por um arquivo de entrada, separados em valor e tipo: export { } / export type { },
// e declarações exportadas direto no arquivo (function, const, class, enum, type, interface)
function exportedNames(file: string) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const values: string[] = [];
  const types: string[] = [];
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st)) {
      expect(st.exportClause, `${path.basename(file)}: export * não é permitido (lista explícita)`).toBeDefined();
      for (const el of (st.exportClause as ts.NamedExports).elements) (st.isTypeOnly || el.isTypeOnly ? types : values).push(el.name.text);
    } else if (isExported(st)) {
      if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) types.push(st.name.text);
      else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) values.push(st.name!.text);
      else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach((d) => values.push(d.name.getText(sf)));
      else throw new Error(`${path.basename(file)}: export não reconhecido pelo teste: ${st.getText(sf).slice(0, 60)}`);
    }
  }
  return { values: values.sort(), types: types.sort() };
}

const sorted = (list: string[]) => [...list].sort();

describe("exports públicos do @cbjk_iris/schema (lista congelada)", () => {
  it(". (raiz): lista explícita, igual à da spec", () => {
    const { values, types } = exportedNames(path.resolve(__dirname, "../src/index.ts"));
    expect(values).toEqual(sorted(ROOT_VALUES));
    expect(types).toEqual(sorted(ROOT_TYPES));
    expect(Object.keys(root).sort()).toEqual(sorted(ROOT_VALUES));
  });

  it("./defaults: lista explícita, igual à da spec", () => {
    const { values, types } = exportedNames(path.resolve(__dirname, "../src/defaults.ts"));
    expect(values).toEqual(sorted(DEFAULTS_VALUES));
    expect(types).toEqual(sorted(DEFAULTS_TYPES));
    expect(Object.keys(defaults).sort()).toEqual(sorted(DEFAULTS_VALUES));
  });

  it('cada export aparece na tabela "Exports do @cbjk_iris/schema" do §5.6 (não basta estar em outro lugar da spec)', () => {
    const spec = readFileSync(path.resolve(__dirname, "../../../docs/spec/SPEC.md"), "utf8");
    const start = spec.indexOf("**Exports do `@cbjk_iris/schema`**");
    expect(start, "tabela de exports não encontrada no §5.6").toBeGreaterThan(-1);
    const end = spec.indexOf("\n### ", start);
    const table = spec.slice(start, end);
    const all = [...ROOT_VALUES, ...ROOT_TYPES, ...DEFAULTS_VALUES, ...DEFAULTS_TYPES];
    expect(all.filter((n) => !table.includes(`\`${n}\``))).toEqual([]);
  });
});
