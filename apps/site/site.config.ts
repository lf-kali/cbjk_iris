import type { SiteConfigInput } from "@cbjk_iris/schema";

// Conteúdo de exemplo: troque nome, marca, contato e textos pelos do cliente.
export const siteConfig = {
  name: "cbjk",
  locale: "pt-BR",
  currency: "BRL",
  // módulos opcionais ligados (products, services, gallery). Desligar um tira as rotas e as seções dele
  // no próximo sync. A CLI muda esta lista com "iris module add/remove".
  modules: ["products", "services", "gallery"],
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
    title: "cbjk | Assistência técnica de celulares",
    titleTemplate: "%s | cbjk",
    description: "Conserto de celulares e acessórios: troca de tela, bateria e conector de carga, com orçamento pelo WhatsApp.",
  },
  whatsapp: {
    // formato internacional, só dígitos
    phone: "5511999999999",
    messages: {
      general: "Olá! Gostaria de um orçamento para o conserto do meu celular.",
      product: "Olá! Tenho interesse no produto abaixo:\n\n*{name}*\nValor: {price}\n\nPodem me passar mais informações e condições?",
      service: "Olá! Gostaria de um orçamento para o serviço abaixo:\n\n*{name}*\n\nPodem me passar o prazo e o valor para o meu modelo de celular?",
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
    hours: ["Segunda a sexta: 9h às 18h", "Sábado: 9h às 13h"],
    mapEmbedUrl: "https://www.google.com/maps?q=Av.+Paulista,+1000,+S%C3%A3o+Paulo&output=embed",
    social: {
      instagram: "https://instagram.com/",
      facebook: "https://facebook.com/",
      youtube: "https://youtube.com/",
    },
  },
  footer: {
    text: "Conserto de celulares e acessórios, com orçamento antes de qualquer reparo.",
  },
  // destino do formulário de lead. Para um serviço de formulários:
  // leads: { provider: "endpoint", endpoint: "https://formspree.io/f/SEU_ID" },
  // Web3Forms: { provider: "endpoint", endpoint: "https://api.web3forms.com/submit", extraFields: { access_key: "SUA_CHAVE" } }
  leads: { provider: "whatsapp" },
  menu: [
    { title: "Início", path: "/" },
    { title: "Produtos", path: "/produtos" },
    { title: "Serviços", path: "/servicos" },
    { title: "Reparos recentes", path: "/ultimos-projetos" },
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
      title: "Reparos recentes",
      empty: "Em breve, fotos dos nossos reparos.",
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
      whatsappIntro: "Olá! Vim pelo site e gostaria de um orçamento para o meu celular.",
    },
    footer: {
      menu: "Navegação",
      contact: "Contato",
      copyright: "© {year} {name}. Todos os direitos reservados.",
    },
  },
} satisfies SiteConfigInput;
