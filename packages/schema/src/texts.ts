// Textos fixos da interface (SPEC §5.2 e §5.3). Os padrões pt-BR ficam em texts-defaults.ts
// (sem zod, para o navegador). Aqui ficam o schema completo e o de entrada (parcial).
import { z } from "zod";
import { PURCHASE_PLATFORMS } from "./constants";

const t = () => z.string();
const platformTexts = () => z.strictObject(Object.fromEntries(PURCHASE_PLATFORMS.map((p) => [p, t()])) as Record<(typeof PURCHASE_PLATFORMS)[number], z.ZodString>);

/** Todas as chaves de texto, com o tipo completo. Fonte única da lista de chaves. */
export const siteTextsSchema = z.strictObject({
  headerCta: t(),
  products: z.strictObject({
    title: t(),
    /** {count} */
    count: t(),
    notFound: t(),
    /** rótulo curto do card ("Comprar agora") */
    buy: t(),
    /** {business} */
    whatsappNotice: t(),
    onSale: t(),
    madeToOrder: t(),
    /** {count} {value} */
    installment: t(),
    interestFree: t(),
    paymentMethods: t(),
    noImage: t(),
    /** rótulo longo de cada botão de compra, no detalhe */
    buttons: platformTexts(),
    /** nome acessível do botão do card: {buy} {platform} */
    cardLabel: t(),
    /** nome de cada plataforma, usado em cardLabel */
    platforms: platformTexts(),
  }),
  services: z.strictObject({
    title: t(),
    /** {count} */
    count: t(),
    notFound: t(),
    quote: t(),
    /** {business} */
    whatsappNotice: t(),
    cardLink: t(),
  }),
  detail: z.strictObject({ description: t(), specs: t() }),
  gallery: z.strictObject({
    title: t(),
    /** exibido quando não há fotos */
    empty: t(),
  }),
  sections: z.strictObject({
    seeAll: t(),
    contact: z.strictObject({ phone: t(), email: t(), address: t(), hours: t(), whatsapp: t(), mapTitle: t() }),
  }),
  leadForm: z.strictObject({
    name: t(),
    phone: t(),
    email: t(),
    message: t(),
    submit: t(),
    sending: t(),
    /** confirmação após enviar para um endpoint */
    success: t(),
    error: t(),
    /** linha de abertura da mensagem quando o destino é o WhatsApp */
    whatsappIntro: t(),
  }),
  footer: z.strictObject({
    menu: t(),
    contact: t(),
    /** {year} {name} */
    copyright: t(),
  }),
});

/** Textos padrão (DEFAULT_TEXTS): todas as chaves, sem a obsoleta buyOnWhatsapp. */
export type DefaultTexts = z.output<typeof siteTextsSchema>;

/** Textos resolvidos, como o core os lê. */
export type SiteTexts = Omit<DefaultTexts, "products"> & {
  products: DefaultTexts["products"] & {
    /** @deprecated use products.buttons.whatsapp. Sempre igual a ele depois de resolveTexts. */
    buyOnWhatsapp: string;
  };
};

/** Textos dos botões de compra, já resolvidos. */
export type PurchaseButtonTexts = SiteTexts["products"]["buttons"];

/** Partial em profundidade (objetos); folhas e listas ficam como estão. */
export type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// Torna opcional cada chave, em todos os níveis, mantendo os objetos strict (chave com erro
// de digitação falha). O zod 4 não tem deepPartial.
function deepPartialSchema(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(Object.entries(schema.shape).map(([k, v]) => [k, deepPartialSchema(v as z.ZodType).optional()]));
    return z.strictObject(shape);
  }
  return schema;
}

/**
 * Entrada de siteConfig.texts: qualquer subconjunto das chaves, mais a obsoleta
 * products.buyOnWhatsapp (vale como products.buttons.whatsapp quando este falta).
 */
export const siteTextsInputSchema = (deepPartialSchema(
  siteTextsSchema.extend({ products: siteTextsSchema.shape.products.extend({ buyOnWhatsapp: t() }) }),
) as unknown) as z.ZodType<DeepPartial<SiteTexts>, DeepPartial<SiteTexts>>;
