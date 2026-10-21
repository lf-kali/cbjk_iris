// Produtos, serviços e botões de compra (SPEC §5.2). O tipo TS é z.infer de cada schema.
import { z } from "zod";
import type { PurchasePlatform } from "./constants";
import { httpsUrlWith, imageSrc, slugSchema } from "./fields";
import type { PurchaseButtonTexts } from "./texts";

/** Hosts aceitos por plataforma (dado, não contrato: acrescentar host é PR ao arquiteto). */
export const PLATFORM_HOSTS = {
  mercadoLivre: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com"],
  shopee: ["shopee.com.br", "shopee.com", "shope.ee"],
  amazon: ["amazon.com.br", "amazon.com", "amzn.to", "a.co"],
} as const;
export type MarketplacePlatform = keyof typeof PLATFORM_HOSTS;

const PLATFORM_MESSAGES: Record<MarketplacePlatform, string> = {
  mercadoLivre: "mercadoLivreLink precisa ser um link https do Mercado Livre (ex.: https://produto.mercadolivre.com.br/...)",
  shopee: "shopeeLink precisa ser um link https da Shopee (ex.: https://shopee.com.br/...)",
  amazon: "amazonLink precisa ser um link https da Amazon (ex.: https://www.amazon.com.br/...)",
};

/** Link https de um marketplace: host da lista ou subdomínio, sem credenciais nem porta, até 2048. */
export function platformUrl(platform: MarketplacePlatform) {
  return httpsUrlWith(PLATFORM_MESSAGES[platform], PLATFORM_HOSTS[platform]);
}

export const specSchema = z.strictObject({
  label: z.string().min(1).meta({ label: "Nome", example: "Material" }),
  value: z.string().min(1).meta({ label: "Valor", example: "Silicone" }),
});

export const installmentSchema = z.strictObject({
  /** número de parcelas, ex.: 10 */
  count: z.number().int().positive().meta({ label: "Parcelas", input: "number" }),
  /** valor de cada parcela */
  value: z.number().positive().meta({ label: "Valor da parcela", input: "number" }),
  /** se as parcelas têm juros; false = "sem juros" */
  hasInterest: z.boolean().optional().meta({ label: "Com juros", input: "confirm" }),
});

export const catalogItemBase = z.object({
  slug: slugSchema.meta({ label: "Slug", description: "Nome do arquivo e parte da URL", example: "capa-iphone-15" }),
  name: z.string().min(1).meta({ label: "Nome" }),
  /** frase curta exibida nos cards e no topo da página de detalhe */
  shortDescription: z.string().min(1).meta({ label: "Descrição curta" }),
  /** texto completo exibido na página de detalhe */
  description: z.string().min(1).meta({ label: "Descrição completa", input: "multiline" }),
  images: z.array(imageSrc).min(1).meta({ label: "Imagens", input: "image", description: "A primeira é a capa" }),
  specs: z.array(specSchema).optional().meta({ label: "Especificações" }),
  /** posição na lista (crescente); sem order vai para o fim; empate por slug */
  order: z.number().int().nonnegative().optional().meta({ label: "Ordem", input: "number" }),
});

export const productSchema = catalogItemBase
  .extend({
    kind: z.literal("product"),
    category: z.string().min(1).meta({ label: "Categoria" }),
    /** preço à vista */
    price: z.number().nonnegative().meta({ label: "Preço à vista", input: "number" }),
    /** preço "de"; maior que price gera o selo de oferta */
    originalPrice: z.number().positive().optional().meta({ label: "Preço original", input: "number", ask: "optional" }),
    installment: installmentSchema.optional().meta({ label: "Parcelamento" }),
    /** 0 = sob encomenda */
    stockQty: z.number().int().nonnegative().meta({ label: "Estoque", input: "number", description: "0 = sob encomenda" }),
    whatsappButton: z.boolean().default(true).meta({ label: "Botão do WhatsApp", input: "confirm" }),
    mercadoLivreLink: platformUrl("mercadoLivre").optional().meta({ label: "Link do Mercado Livre", input: "url", ask: "optional" }),
    shopeeLink: platformUrl("shopee").optional().meta({ label: "Link da Shopee", input: "url", ask: "optional" }),
    amazonLink: platformUrl("amazon").optional().meta({ label: "Link da Amazon", input: "url", ask: "optional" }),
    externalLink: httpsUrlWith("externalLink precisa começar com https://").optional().meta({ label: "Link de outra loja", input: "url", ask: "optional" }),
  })
  .strict();

export const serviceSchema = catalogItemBase.extend({ kind: z.literal("service") }).strict();

/** content/products/<slug>.json: sem kind e sem slug (vêm do diretório e do nome do arquivo). */
export const productContentSchema = productSchema.omit({ kind: true, slug: true });
/** content/services/<slug>.json */
export const serviceContentSchema = serviceSchema.omit({ kind: true, slug: true });

export type Product = z.output<typeof productSchema>;
export type ProductInput = z.input<typeof productSchema>;
export type Service = z.output<typeof serviceSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type CatalogItem = Product | Service;
export type Spec = z.output<typeof specSchema>;
export type Installment = z.output<typeof installmentSchema>;

export interface ProductFilter {
  /** comparação exata, sem diferenciar maiúsculas */
  category?: string;
  /** remove um produto pelo slug (útil para "relacionados") */
  excludeSlug?: string;
  limit?: number;
}

export interface PurchaseContext {
  /** URL do WhatsApp já montada para este produto (lib/whatsapp); null = sem WhatsApp no site */
  whatsappUrl: string | null;
  /** siteConfig.commerce.buttonOrder já resolvido: as 5 plataformas, cada uma uma vez */
  order: readonly PurchasePlatform[];
  /** siteConfig.texts.products.buttons, já resolvido por resolveTexts */
  texts: PurchaseButtonTexts;
}

export interface PurchaseButton {
  platform: PurchasePlatform;
  href: string;
  /** texto final, já resolvido */
  label: string;
  emphasis: "primary" | "secondary";
  /** variante do Button: primary+whatsapp = "cta"; primary+outro = "default"; secondary = "outline" */
  variant: "cta" | "default" | "outline";
  rel: "noopener noreferrer";
  target: "_blank";
}

export type ResolvePurchaseButtons = (product: Product, ctx: PurchaseContext) => PurchaseButton[];
