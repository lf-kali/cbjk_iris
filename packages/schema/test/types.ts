// Testes de tipo: checados pelo tsc (npm run typecheck), não pelo vitest.
import type {
  CliResult,
  ImportTheme,
  PurchaseButtonTexts,
  SectionComponent,
  SectionOf,
  SectionRegistry,
  SiteConfig,
  SiteConfigInput,
  SiteTexts,
  StyleId,
} from "../src";

// ImportTheme: exatamente uma fonte
declare const importTheme: ImportTheme;
void importTheme({ tweakcn: "https://tweakcn.com/r/themes/x.json" });
void importTheme({ shadcn: "zinc" }, "meu-tema");
// @ts-expect-error duas fontes ao mesmo tempo
void importTheme({ url: "https://a.com/t.css", shadcn: "zinc" });
// @ts-expect-error nenhuma fonte
void importTheme({});

// SectionRegistry sem React: componente síncrono e assíncrono
const Faq = ({ section }: { section: SectionOf<"faq"> }) => section.items.length;
const Products = async ({ section }: { section: SectionOf<"products"> }) => section.limit;
export const registry: SectionRegistry = { faq: Faq, products: Products };
// @ts-expect-error componente de outra seção
export const wrong: SectionRegistry = { faq: Products };
export const one: SectionComponent<"stats"> = ({ section }) => section.items[0].value;

// SectionOf discrimina pelo type
export const question: string = ({} as SectionOf<"faq">).items[0].question;

// Config de entrada: texts parcial e opcional; resolvido: tudo preenchido
export const input: SiteConfigInput = {
  name: "a",
  locale: "pt-BR",
  currency: "BRL",
  brand: { colors: {} },
  seo: { title: "a", titleTemplate: "%s" },
  whatsapp: { phone: "5511999999999", messages: { general: "a", product: "a", service: "a" } },
  images: { remoteHosts: [] },
  theme: { name: "neutral", colorMode: "system" },
  menu: [],
  texts: { products: { buttons: { shopee: "x" } } },
};
declare const resolved: SiteConfig;
export const order: readonly ("whatsapp" | "mercadoLivre" | "shopee" | "amazon" | "external")[] = resolved.commerce.buttonOrder;
export const buy: string = resolved.texts.products.buyOnWhatsapp;
export const buttons: PurchaseButtonTexts = resolved.texts.products.buttons;
export const modules: ("products" | "services" | "gallery")[] = resolved.modules;
export const style: StyleId | undefined = resolved.theme.style;
export const texts: SiteTexts = resolved.texts;

// CliResult: ok e erro são exclusivos
export const okResult: CliResult<{ slug: string }> = {
  schemaVersion: 1,
  ok: true,
  command: "product add",
  data: { slug: "x" },
  changes: [],
  warnings: [],
};
export const errResult: CliResult = {
  schemaVersion: 1,
  ok: false,
  command: "x",
  data: null,
  changes: [],
  warnings: [],
  error: { code: "USAGE", exitCode: 2, message: "m" },
};
