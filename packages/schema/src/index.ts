// @cbjk_iris/schema: contratos do Iris (SPEC §5). Lista explícita: só sai daqui o que a spec nomeia
// (§5.6, "Exports do @cbjk_iris/schema"); test/exports.test.ts congela a lista.
// O subpath ./defaults (defaults.ts) reexporta só a parte sem zod, para o navegador.

// §5.2 catálogo e botões de compra
export {
  catalogItemBase,
  installmentSchema,
  PLATFORM_HOSTS,
  platformUrl,
  productContentSchema,
  productSchema,
  serviceContentSchema,
  serviceSchema,
} from "./catalog";
export type {
  CatalogItem,
  Installment,
  MarketplacePlatform,
  Product,
  ProductFilter,
  ProductInput,
  PurchaseButton,
  PurchaseContext,
  ResolvePurchaseButtons,
  Service,
  ServiceInput,
  Spec,
} from "./catalog";
export { DEFAULT_BUTTON_ORDER, PURCHASE_PLATFORMS } from "./constants";
export type { PurchasePlatform } from "./constants";
export { httpsUrl, ptBRError, slugSchema } from "./fields";

// §5.3 config, textos e conteúdo
export { applySiteConfigDefaults } from "./defaults";
export { resolveSiteConfig, SiteConfigError, siteConfigSchema } from "./site-config";
export type {
  BrandColors,
  BrandConfig,
  BrandFont,
  CommerceConfig,
  ContactInfo,
  FooterConfig,
  LeadsConfig,
  MenuItem,
  PageConfig,
  SiteConfig,
  SiteConfigInput,
  SiteLogo,
} from "./site-config";
export { COLOR_TOKENS, SECTION_ICONS } from "./constants";
export type { ColorMode, ColorToken, ColorTokens, LeadField, SectionIcon, SocialNetwork } from "./constants";
export { DEFAULT_TEXTS, resolveTexts } from "./texts-defaults";
export type { DeepPartial, PurchaseButtonTexts, SiteTexts } from "./texts";
export { homeSchema, pageSchema, pageSlugSchema, RESERVED_PAGE_SLUGS } from "./page";
export type { Home, Page } from "./page";
export { formatIssuePath } from "./issues";
export type { SiteLink } from "./links";

// §5.4 tokens de forma e estilos
export {
  DEFAULT_STYLE_ID,
  FROZEN_UTILITIES,
  IRIS_STYLE_VAR,
  SHAPE_TOKEN_KEYS,
  SHAPE_TOKENS,
  STYLE_IDS,
} from "./theme/tokens";
export type { ShapeTokenKey, ShapeTokenName, ShapeTokens, ShapeTokenSpec, StyleId } from "./theme/tokens";

// §5.5 seções e módulos
export { defineSection, fieldAsk, fieldMeta, fieldMetaSchema, sectionBase } from "./define";
export type { FieldMeta, SectionDefinition, SectionLimits, SectionModule, SectionPreset } from "./define";
export { getSectionDefinition, SECTION_TYPES, sectionDefinitions, sectionSchema, sectionsOfModule } from "./sections";
export type {
  BenefitsSection,
  ContactSection,
  CtaBannerSection,
  FaqSection,
  GallerySection,
  HeroSection,
  HeroSlide,
  LeadFormSection,
  ProductsSection,
  Section,
  SectionInput,
  SectionOf,
  SectionType,
  ServicesSection,
  StatsSection,
  TestimonialsSection,
  TextImageSection,
  WidgetSection,
} from "./sections";
export { DEFAULT_MODULES, MODULE_IDS, MODULES } from "./modules";
export type { ModuleId } from "./modules";
export type { SectionComponent, SectionRegistry } from "./registry";

// §5.6 API do engine (só tipos)
export type {
  CheckContent,
  Diagnostic,
  FileChange,
  ImportTheme,
  ImportThemeSource,
  ListStyles,
  ListThemes,
  LoadSiteConfig,
  RemoveModuleContent,
  StyleInfo,
  Sync,
  SyncBrand,
  SyncRegistry,
  SyncResult,
  SyncRoutes,
  ThemeInfo,
  ValidateTheme,
} from "./engine-api";

// §5.7 CLI
export { cliResultSchema, EXIT_CODES } from "./cli";
export type { CliError, CliErrorCode, CliResult } from "./cli";
