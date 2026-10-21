// Config do site (SPEC §5.3). O cliente escreve SiteConfigInput (satisfies) no site.config.ts;
// o core lê SiteConfig, com os padrões preenchidos.
//
// Onde roda: a validação completa (resolveSiteConfig, com zod) roda no Node, pelo withIris
// (next.config) e pelo engine. No navegador, o core só preenche os padrões com
// applySiteConfigDefaults (@cbjk_iris/schema/defaults, sem zod), para o zod não ir para o bundle.
import { z } from "zod";
import { COLOR_MODES, COLOR_TOKENS, PURCHASE_PLATFORMS, SOCIAL_NETWORKS, completeButtonOrder } from "./constants";
import { cssValue, hostnameSchema, httpsUrl, imageSrc, ptBRError, siteHref, slugSchema, uniqueItems, urlProblem } from "./fields";
import { formatIssuePath } from "./issues";
import { siteLinkSchema } from "./links";
import { MODULE_IDS, type ModuleId } from "./modules";
import { homeSchema, pageSchema, pageSlugSchema } from "./page";
import { resolveTexts } from "./texts-defaults";
import { siteTextsInputSchema } from "./texts";
import { SHAPE_TOKEN_KEYS, STYLE_IDS } from "./theme/tokens";

export type MenuItem = { title: string; path?: string; children?: MenuItem[] };

export const menuItemSchema: z.ZodType<MenuItem> = z.strictObject({
  title: z.string().min(1),
  path: siteHref.optional(),
  get children() {
    return z.array(menuItemSchema).optional();
  },
});

export const siteLogoSchema = z.strictObject({
  src: imageSrc,
  alt: z.string().min(1),
  /** dimensões originais, usadas para a proporção */
  width: z.number().positive(),
  height: z.number().positive(),
  /** SVG de uma cor só: herda a cor do texto e acompanha o modo escuro */
  monochrome: z.boolean().optional(),
});

// Nome de família do Google e pesos: vão para o TS gerado (fonts.generated.ts)
const googleFontName = z.string().regex(/^[A-Za-z0-9 ]+$/, { error: 'use o nome exato do Google Fonts, ex.: "Playfair Display"' });
const fontPath = z.string().refine(
  (p) => !p.startsWith("/") && !/^[A-Za-z]:/.test(p) && !p.includes("\\") && !p.split("/").includes("..") && /^[\w./ -]+\.(?:woff2?|ttf|otf)$/.test(p),
  { error: "caminho relativo à raiz do projeto, sem .., terminando em .woff2, .woff, .ttf ou .otf (ex.: fonts/marca.woff2)" },
);

/** Fonte do Google (nome exato, ex.: "Playfair Display") ou arquivos locais. */
export const brandFontSchema = z.union([
  z.strictObject({ google: googleFontName, weights: z.array(z.string().regex(/^(?:\d{3}|variable)$/)).optional() }),
  z.strictObject({
    local: z
      .array(
        z.strictObject({
          path: fontPath,
          weight: z.string().regex(/^\d{3}(?: \d{3})?$/, { error: 'use "400" ou uma faixa "100 900"' }),
          style: z.enum(["normal", "italic"]).optional(),
        }),
      )
      .min(1),
  }),
]);

const colorOverrides = z.partialRecord(z.enum(COLOR_TOKENS), cssValue);

export const brandSchema = z.strictObject({
  logo: siteLogoSchema.optional(),
  /** texto ao lado do logo; sem logo e sem texto, usa o name */
  logoText: z.string().min(1).optional(),
  /** cores da marca, por cima do tema; em branco = cor do tema. Qualquer cor CSS */
  colors: z.strictObject({
    /** cor principal (botões padrão, links de destaque) */
    primary: cssValue.optional(),
    /** botões de ação, como o WhatsApp; em branco = primary */
    cta: cssValue.optional(),
    /** badges de oferta e destaques pontuais; em branco = destructive do tema */
    highlight: cssValue.optional(),
  }),
  /** arredondamento base, ex.: "0.625rem"; atalho de shape.radius; em branco = o do tema */
  radius: cssValue.optional(),
  /** tokens de forma (SHAPE_TOKENS), sem o "--": { "radius-control": "9999px" } */
  shape: z.partialRecord(z.enum(SHAPE_TOKEN_KEYS), cssValue).optional(),
  /** em branco = fonte do tema (--font-sans do arquivo em themes/) */
  fonts: z.strictObject({ sans: brandFontSchema.optional(), heading: brandFontSchema.optional() }).optional(),
  /** sobrescreve qualquer variável final de cor, por modo (ex.: colar trechos do tweakcn) */
  overrides: z.strictObject({ light: colorOverrides.optional(), dark: colorOverrides.optional() }).optional(),
});

const MAP_EMBED_ERROR =
  "use o link de incorporar do mapa do Google (Google Maps → Compartilhar → Incorporar um mapa): https://www.google.com/maps/embed?pb=...";

/**
 * src do iframe do mapa: só o Google Maps incorporado. Passa por urlProblem (valor cru, https,
 * sem credencial nem porta), host exato www.google.com, e caminho /maps/embed (qualquer query)
 * ou /maps com output=embed na query.
 */
const mapEmbedUrlSchema = z.string().refine(
  (v) => {
    if (urlProblem(v) !== null) return false;
    const url = new URL(v);
    if (url.hostname !== "www.google.com") return false;
    return url.pathname === "/maps/embed" || (url.pathname === "/maps" && url.searchParams.get("output") === "embed");
  },
  { error: MAP_EMBED_ERROR },
);

export const contactSchema = z.strictObject({
  phone: z.string().min(1).optional(),
  email: z.email({ error: "use um e-mail válido, ex.: contato@loja.com.br" }).optional(),
  address: z.string().min(1).optional(),
  /** linhas de horário, ex.: ["Seg a sex: 8h às 18h", "Sáb: 8h às 12h"] */
  hours: z.array(z.string().min(1)).optional(),
  /** URL de "Incorporar um mapa" do Google Maps (src do iframe) */
  mapEmbedUrl: mapEmbedUrlSchema.optional(),
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), httpsUrl).optional(),
});

/**
 * Para onde vão os dados do formulário de lead:
 * - "whatsapp": abre uma conversa com os dados preenchidos (não precisa de conta)
 * - "endpoint": POST em JSON para um serviço de formulários (Formspree, Web3Forms...)
 * - "backend": reservado para o template de backend (ainda não implementado)
 */
export const leadsSchema = z.discriminatedUnion("provider", [
  z.strictObject({ provider: z.literal("whatsapp"), intro: z.string().min(1).optional() }),
  z.strictObject({
    provider: z.literal("endpoint"),
    /** URL que recebe o POST, ex.: "https://formspree.io/f/abcd1234" */
    endpoint: httpsUrl,
    /** campos fixos enviados junto (ex.: access_key do Web3Forms, que é pública por design) */
    extraFields: z.record(z.string(), z.string()).optional(),
  }),
  z.strictObject({ provider: z.literal("backend") }),
]);

export const footerSchema = z.strictObject({
  /** frase curta abaixo do logo */
  text: z.string().min(1).optional(),
  /** colunas de links; em branco = links do menu principal */
  columns: z.array(z.strictObject({ title: z.string().min(1), links: z.array(siteLinkSchema) })).optional(),
});

const buttonOrderSchema = z.array(z.enum(PURCHASE_PLATFORMS)).superRefine(uniqueItems("plataforma"));

/** @deprecated transição até a E5: páginas passam para content/pages/<slug>.json */
const legacyPagesSchema = z
  .array(pageSchema.extend({ slug: pageSlugSchema }))
  .superRefine((pages, ctx) => uniqueItems("slug de página")(pages.map((p) => p.slug), ctx));

export const siteConfigSchema = z.strictObject({
  name: z.string().min(1),
  locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, { error: 'use um código de idioma, ex.: "pt-BR"' }),
  /** código ISO 4217, ex.: BRL, USD */
  currency: z.string().regex(/^[A-Z]{3}$/, { error: 'use o código ISO 4217, ex.: "BRL"' }),
  brand: brandSchema,
  seo: z.strictObject({
    title: z.string().min(1),
    titleTemplate: z.string().includes("%s", { error: 'precisa ter %s no lugar do título da página, ex.: "%s | Loja"' }),
    description: z.string().min(1).optional(),
  }),
  whatsapp: z.strictObject({
    /** formato internacional, só dígitos (ex.: 5551999999999) */
    phone: z.string().regex(/^\d{10,15}$/, { error: "use o formato internacional, só dígitos (ex.: 5511999999999)" }),
    /** modelos de mensagem; {name} e {price} são substituídos */
    messages: z.strictObject({ general: z.string().min(1), product: z.string().min(1), service: z.string().min(1) }),
  }),
  images: z.strictObject({
    /** hosts externos liberados para next/image (vira remotePatterns). Só o host exato */
    remoteHosts: z.array(hostnameSchema),
  }),
  theme: z.strictObject({
    /** arquivo em themes/ (sem .css) */
    name: slugSchema,
    colorMode: z.enum(COLOR_MODES),
    /** estilo (forma dos componentes); ausente = o --iris-style do tema, ou "sera" */
    style: z.enum(STYLE_IDS).optional(),
  }),
  menu: z.array(menuItemSchema),
  /** dados de contato usados pela seção "contact" e pelo rodapé */
  contact: contactSchema.optional(),
  footer: footerSchema.optional(),
  /** destino do formulário de lead (seção "lead-form") */
  leads: leadsSchema.optional(),
  /** módulos ativos; ausente = os três */
  modules: z
    .array(z.enum(MODULE_IDS as readonly [ModuleId, ...ModuleId[]]))
    .superRefine(uniqueItems("módulo"))
    .optional()
    .transform((m): ModuleId[] => m ?? [...MODULE_IDS]),
  /** botões de compra; buttonOrder ausente = DEFAULT_BUTTON_ORDER, e o que faltar vai para o fim */
  commerce: z
    .strictObject({ buttonOrder: buttonOrderSchema.optional() })
    .optional()
    .transform((c) => ({ ...c, buttonOrder: completeButtonOrder(c?.buttonOrder) })),
  /** @deprecated transição até a E5: a home passa para content/home.json */
  home: homeSchema.optional().transform((h) => h ?? { sections: [] }),
  /** @deprecated transição até a E5: as páginas passam para content/pages/<slug>.json */
  pages: legacyPagesSchema.optional(),
  /** textos da interface; parcial, mesclado com DEFAULT_TEXTS */
  texts: siteTextsInputSchema.optional().transform((t) => resolveTexts(t)),
});

/** O que o cliente escreve no site.config.ts (texts parcial, modules e commerce opcionais...). */
export type SiteConfigInput = z.input<typeof siteConfigSchema>;
/** Config resolvido, com tudo preenchido. */
export type SiteConfig = z.output<typeof siteConfigSchema>;

export type BrandConfig = z.output<typeof brandSchema>;
export type BrandColors = BrandConfig["colors"];
export type BrandFont = z.output<typeof brandFontSchema>;
export type SiteLogo = z.output<typeof siteLogoSchema>;
export type ContactInfo = z.output<typeof contactSchema>;
export type LeadsConfig = z.output<typeof leadsSchema>;
export type FooterConfig = z.output<typeof footerSchema>;
export type CommerceConfig = SiteConfig["commerce"];
/** @deprecated transição até a E5 */
export type PageConfig = NonNullable<SiteConfig["pages"]>[number];

/** Config inválido: a mensagem lista cada erro com o caminho do campo. */
export class SiteConfigError extends Error {
  readonly issues: z.core.$ZodIssue[];
  constructor(issues: z.core.$ZodIssue[], file = "site.config.ts") {
    super(`${file} tem erros:\n${issues.map((i) => `  - ${formatIssuePath(i.path)}: ${i.message}`).join("\n")}`);
    this.name = "SiteConfigError";
    this.issues = issues;
  }
}

/** Valida e preenche os padrões. Lança SiteConfigError, com mensagens em pt-BR. Roda no Node. */
export function resolveSiteConfig(input: SiteConfigInput): SiteConfig {
  const result = siteConfigSchema.safeParse(input, { error: ptBRError });
  if (!result.success) throw new SiteConfigError(result.error.issues);
  return result.data;
}
