import type { SiteConfigInput } from "@cbjk_iris/schema";

// Conteúdo de exemplo: troque nome, marca, contato e textos pelos do cliente.
export const siteConfig = {
  name: "cbjk",
  locale: "pt-BR",
  currency: "BRL",
  theme: {
    // arquivo em themes/: neutral, stone, zinc, slate, gray, taupe (shadcn),
    // modern-minimal, ocean-breeze, caffeine, elegant-luxury (tweakcn) ou um colado à mão
    name: "taupe",
    colorMode: "system",
  },
  brand: {
    logo: { src: "/logo.svg", alt: "cbjk", width: 145, height: 86.03, monochrome: true },
    // em branco = cores do tema; preencha para aplicar a marca por cima de qualquer tema
    colors: {},
  },
  seo: {
    title: "cbjk | Soluções completas para sua casa",
    titleTemplate: "%s | cbjk",
    description: "Produtos e serviços para construir, reformar e cuidar da sua casa, com atendimento direto pelo WhatsApp.",
  },
  whatsapp: {
    // formato internacional, só dígitos
    phone: "5511999999999",
    messages: {
      general: "Olá! Gostaria de fazer um orçamento.",
      product: "Olá! Tenho interesse no produto abaixo:\n\n*{name}*\nValor: {price}\n\nPodem me passar mais informações e condições?",
      service: "Olá! Gostaria de pedir um orçamento para o serviço abaixo:\n\n*{name}*\n\nPodem me passar mais informações sobre prazo e valores?",
    },
  },
  images: {
    // ex.: ["ik.imagekit.io"] — vazio enquanto todas as imagens forem locais
    remoteHosts: [],
  },
  contact: {
    phone: "(11) 99999-9999",
    email: "contato@cbjk.com.br",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    hours: ["Segunda a sexta: 8h às 18h", "Sábado: 8h às 12h"],
    mapEmbedUrl: "https://www.google.com/maps?q=Av.+Paulista,+1000,+S%C3%A3o+Paulo&output=embed",
    social: {
      instagram: "https://instagram.com/",
      facebook: "https://facebook.com/",
      youtube: "https://youtube.com/",
    },
  },
  footer: {
    text: "Produtos e serviços para construir, reformar e cuidar da sua casa.",
  },
  // destino do formulário de lead. Para um serviço de formulários:
  // leads: { provider: "endpoint", endpoint: "https://formspree.io/f/SEU_ID" },
  // Web3Forms: { provider: "endpoint", endpoint: "https://api.web3forms.com/submit", extraFields: { access_key: "SUA_CHAVE" } }
  leads: { provider: "whatsapp" },
  menu: [
    { title: "Início", path: "/" },
    { title: "Produtos", path: "/produtos" },
    { title: "Serviços", path: "/servicos" },
    { title: "Projetos", path: "/ultimos-projetos" },
    { title: "Sobre", path: "/sobre" },
    { title: "Contato", path: "/contato" },
  ],
  // seções da home e páginas extras ficam em content/home.json e content/pages/<slug>.json;
  // produtos e serviços, em content/products/ e content/services/ (um JSON por item)
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
      title: "Últimos projetos",
      empty: "Em breve, fotos dos nossos projetos.",
    },
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
  },
} satisfies SiteConfigInput;
