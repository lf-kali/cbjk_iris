// Padrões pt-BR dos textos e o merge com o que o cliente escreveu. Sem zod: vai para o navegador.
import type { DeepPartial, DefaultTexts, SiteTexts } from "./texts";

type Plain = Record<string, unknown>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const DEFAULT_TEXTS: DefaultTexts = deepFreeze({
  headerCta: "Faça seu orçamento!",
  products: {
    title: "Produtos",
    count: "{count} produtos disponíveis",
    notFound: "Produto não encontrado",
    buy: "Comprar agora",
    whatsappNotice: "Você será direcionado ao WhatsApp da {business} com uma mensagem já preenchida para fechar os detalhes da compra.",
    onSale: "Oferta",
    madeToOrder: "Sob encomenda",
    installment: "ou {count}x de {value}",
    interestFree: "sem juros",
    paymentMethods: "Pix, Débito ou Crédito",
    noImage: "Sem imagem",
    buttons: {
      whatsapp: "Comprar pelo WhatsApp",
      mercadoLivre: "Comprar no Mercado Livre",
      shopee: "Comprar na Shopee",
      amazon: "Comprar na Amazon",
      external: "Comprar no site",
    },
    cardLabel: "{buy} ({platform})",
    platforms: {
      whatsapp: "WhatsApp",
      mercadoLivre: "Mercado Livre",
      shopee: "Shopee",
      amazon: "Amazon",
      external: "site",
    },
  },
  services: {
    title: "Serviços",
    count: "{count} serviços disponíveis",
    notFound: "Serviço não encontrado",
    quote: "Peça seu orçamento",
    whatsappNotice: "Você será direcionado ao WhatsApp da {business} com uma mensagem já preenchida para pedir seu orçamento.",
    cardLink: "Ver detalhes e pedir orçamento →",
  },
  detail: { description: "Descrição", specs: "Especificações" },
  gallery: { title: "Últimos projetos", empty: "Em breve, fotos dos nossos projetos." },
  sections: {
    seeAll: "Ver todos",
    contact: {
      phone: "Telefone",
      email: "E-mail",
      address: "Endereço",
      hours: "Horário de atendimento",
      whatsapp: "Falar no WhatsApp",
      mapTitle: "Mapa com a nossa localização",
    },
  },
  leadForm: {
    name: "Nome",
    phone: "Telefone / WhatsApp",
    email: "E-mail",
    message: "Mensagem",
    submit: "Enviar",
    sending: "Enviando...",
    success: "Recebemos sua mensagem! Entraremos em contato em breve.",
    error: "Não foi possível enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.",
    whatsappIntro: "Olá! Vim pelo site e gostaria de um orçamento.",
  },
  footer: {
    menu: "Navegação",
    contact: "Contato",
    copyright: "© {year} {name}. Todos os direitos reservados.",
  },
});

const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

// merge profundo que devolve objetos novos; não muta nenhum dos dois lados
function merge(base: Plain, patch: Plain | undefined): Plain {
  const out: Plain = {};
  for (const [key, value] of Object.entries(base)) {
    const next = patch?.[key];
    out[key] = isPlain(value) ? merge(value, isPlain(next) ? next : undefined) : next === undefined ? value : next;
  }
  return out;
}

/**
 * Mescla os textos do cliente com DEFAULT_TEXTS. Fallback obsoleto: products.buyOnWhatsapp vale
 * como products.buttons.whatsapp quando este falta; na saída, buyOnWhatsapp é sempre igual a ele.
 */
export function resolveTexts(partial?: DeepPartial<SiteTexts>): SiteTexts {
  const merged = merge(DEFAULT_TEXTS as unknown as Plain, partial as Plain | undefined) as unknown as DefaultTexts;
  const legacy = partial?.products?.buyOnWhatsapp;
  const whatsapp = partial?.products?.buttons?.whatsapp ?? legacy ?? merged.products.buttons.whatsapp;
  return {
    ...merged,
    products: { ...merged.products, buttons: { ...merged.products.buttons, whatsapp }, buyOnWhatsapp: whatsapp },
  };
}
