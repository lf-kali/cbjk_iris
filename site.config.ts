import type { SiteConfig } from "@/types/site-config";

export const siteConfig: SiteConfig = {
  name: "JR Acabamentos",
  locale: "pt-BR",
  currency: "BRL",
  brand: {
    logo: { src: "/JRiso.svg", alt: "JR", width: 1500, height: 1500, monochrome: true },
    logoText: "Acabamentos",
  },
  seo: {
    title: "JR - Acabamentos de alto padrão",
    titleTemplate: "%s | JR Acabamentos",
  },
  whatsapp: {
    // TODO: substituir pelo número real da JR Acabamentos
    phone: "5551999999999",
    messages: {
      general: "Olá! Gostaria de fazer um orçamento.",
      product: "Olá! Tenho interesse no produto abaixo:\n\n*{name}*\nValor: {price}\n\nPodem me passar mais informações e condições?",
      service: "Olá! Gostaria de pedir um orçamento para o serviço abaixo:\n\n*{name}*\n\nPodem me passar mais informações sobre prazo e valores?",
    },
  },
  images: {
    remoteHosts: ["www.seuprodutonaweb.com.br", "http2.mlstatic.com"],
  },
  theme: {
    colorMode: "system",
  },
  menu: [
    { title: "Início", path: "/" },
    { title: "Nossos Produtos", path: "/produtos" },
    { title: "Nossos Serviços", path: "/servicos" },
    { title: "Últimos Projetos", path: "/ultimos-projetos" },
  ],
  home: {
    slides: [
      {
        image: "https://www.seuprodutonaweb.com.br/fotos/20240429_122606_empreiteiro-de-obras-alto-padrao.jpg",
        alt: "",
        title: "Acabamentos de precisão",
        subtitle: "Do projeto à entrega, sem retrabalho.",
      },
      {
        image: "https://www.seuprodutonaweb.com.br/fotos/20240429_122606_empreiteiro-de-obras-alto-padrao.jpg",
        alt: "",
        title: "Acabamentos de precisão",
        subtitle: "Do projeto à entrega, sem retrabalho.",
      },
    ],
  },
  texts: {
    headerCta: "Faça seu orçamento!",
    products: {
      title: "Produtos",
      count: "{count} produtos disponíveis",
      notFound: "Produto não encontrado",
      buy: "Comprar agora",
      buyOnWhatsapp: "Comprar pelo WhatsApp",
      whatsappNotice: "Você será direcionado ao WhatsApp da {business} com uma mensagem já preenchida para fechar os detalhes da compra.",
      onSale: "Oferta",
      madeToOrder: "Sob encomenda",
      installment: "ou {count}x de {value}",
      interestFree: "sem juros",
      paymentMethods: "Pix, Débito ou Crédito",
      noImage: "Sem imagem",
    },
    services: {
      title: "Serviços",
      count: "{count} serviços disponíveis",
      notFound: "Serviço não encontrado",
      quote: "Peça seu orçamento",
      whatsappNotice: "Você será direcionado ao WhatsApp da {business} com uma mensagem já preenchida para pedir seu orçamento.",
      cardLink: "Ver detalhes e pedir orçamento →",
    },
    detail: {
      description: "Descrição",
      specs: "Especificações",
    },
    gallery: {
      title: "Nossos últimos serviços",
    },
  },
};
