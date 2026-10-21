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
  home: {
    sections: [
      {
        type: "hero",
        height: "lg",
        slides: [
          {
            image: "/home/slide-1.jpg",
            alt: "Sala de estar reformada",
            title: "Sua casa do jeito que você imaginou",
            subtitle: "Produtos selecionados e equipe própria, do projeto à entrega.",
            cta: { label: "Pedir orçamento", whatsapp: true },
            secondaryCta: { label: "Conheça a cbjk", href: "/sobre" },
          },
          {
            image: "/home/slide-2.jpg",
            alt: "Sala com parede de tijolos e piso de madeira",
            title: "Visita técnica sem custo",
            subtitle: "Agende pelo WhatsApp e receba um orçamento detalhado.",
            cta: { label: "Agendar visita", whatsapp: "Olá! Gostaria de agendar uma visita técnica." },
            align: "center",
          },
        ],
      },
      {
        type: "benefits",
        title: "Por que escolher a cbjk",
        items: [
          { icon: "shield-check", title: "Garantia de 12 meses", text: "Todos os serviços com garantia por escrito." },
          { icon: "clock", title: "Prazo cumprido", text: "Cronograma combinado antes de começar a obra." },
          { icon: "hand-coins", title: "Orçamento sem custo", text: "Visita técnica e orçamento detalhado grátis." },
          { icon: "users", title: "Equipe própria", text: "Profissionais treinados, sem terceirização." },
        ],
      },
      { type: "products", title: "Destaques da loja" },
      { type: "services", title: "Nossos serviços", subtitle: "Do reparo pontual à reforma completa." },
      {
        type: "stats",
        items: [
          { value: "10+", label: "anos de experiência" },
          { value: "500+", label: "obras entregues" },
          { value: "4,9", label: "nota média dos clientes" },
          { value: "12", label: "meses de garantia" },
        ],
      },
      {
        type: "testimonials",
        title: "O que dizem nossos clientes",
        items: [
          { name: "Mariana Souza", role: "Reforma de banheiro", rating: 5, text: "Equipe pontual e cuidadosa. Entregaram antes do prazo e deixaram tudo limpo." },
          { name: "Carlos Lima", role: "Instalação elétrica", rating: 5, text: "Explicaram cada etapa e o orçamento bateu com o valor final. Recomendo." },
          { name: "Fernanda Alves", role: "Piso porcelanato", rating: 5, text: "Acabamento impecável. Já chamei de novo para a cozinha." },
        ],
      },
      { type: "gallery", title: "Projetos recentes", limit: 6 },
      {
        type: "cta-banner",
        title: "Pronto para começar?",
        text: "Fale com a gente pelo WhatsApp e receba seu orçamento em até 24 horas.",
        cta: { label: "Falar no WhatsApp", whatsapp: true },
        tone: "primary",
      },
    ],
  },
  pages: [
    {
      slug: "sobre",
      title: "Sobre nós",
      description: "Conheça a cbjk: história, forma de trabalho e números.",
      sections: [
        {
          type: "text-image",
          title: "Sobre a cbjk",
          subtitle: "Mais de 10 anos cuidando de casas",
          text: "Começamos como uma pequena equipe de reformas e hoje atendemos de reparos pontuais a obras completas, com loja própria de acabamentos.\n\nNosso jeito de trabalhar é simples: orçamento claro, cronograma combinado e garantia por escrito em todos os serviços.",
          image: "/home/slide-1.jpg",
          imageAlt: "Sala de estar reformada pela equipe",
          cta: { label: "Fale com a gente", whatsapp: true },
        },
        {
          type: "stats",
          items: [
            { value: "10+", label: "anos de experiência" },
            { value: "500+", label: "obras entregues" },
            { value: "30", label: "profissionais" },
            { value: "12", label: "meses de garantia" },
          ],
        },
        {
          type: "faq",
          title: "Perguntas frequentes",
          items: [
            { question: "Vocês atendem em quais regiões?", answer: "Atendemos a capital e a região metropolitana. Consulte outras cidades pelo WhatsApp." },
            { question: "O orçamento tem custo?", answer: "Não. A visita técnica e o orçamento detalhado são gratuitos." },
            { question: "Qual a garantia dos serviços?", answer: "Todos os serviços têm garantia de 12 meses, com termo por escrito." },
            { question: "Quais as formas de pagamento?", answer: "Pix, débito, crédito em até 10x e boleto para empresas." },
          ],
        },
        // Avaliações de outras plataformas: cole o código oficial do widget, ex.:
        // { type: "widget", title: "Avaliações no TripAdvisor", html: `<div id="TA_..."></div><script src="https://www.jscache.com/..."></script>`, minHeight: "320px" },
      ],
    },
    {
      slug: "contato",
      title: "Contato",
      description: "Endereço, horário de atendimento e WhatsApp da cbjk.",
      sections: [
        { type: "contact", title: "Fale com a gente", subtitle: "Atendimento rápido pelo WhatsApp.", showMap: true },
        {
          type: "lead-form",
          title: "Peça seu orçamento",
          subtitle: "Preencha os dados e continue a conversa pelo WhatsApp.",
          fields: ["name", "phone", "email", "message"],
          consentText: "Concordo em ser contatado pela cbjk sobre este pedido.",
        },
      ],
    },
  ],
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
