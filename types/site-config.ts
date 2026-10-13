export interface MenuItem {
  title: string;
  path?: string;
  children?: MenuItem[];
}

export interface HomeSlide {
  image: string;
  alt: string;
  title: string;
  subtitle?: string;
}

// "system": começa pelo tema do sistema e mostra o botão de troca.
// "light" | "dark": tema fixo, sem botão.
export type ColorMode = "system" | "light" | "dark";

export interface SiteLogo {
  src: string;
  alt: string;
  /** dimensões originais, usadas para a proporção */
  width: number;
  height: number;
  /** SVG de uma cor só: herda a cor do texto e acompanha o modo escuro */
  monochrome?: boolean;
}

export interface SiteTexts {
  headerCta: string;
  products: {
    title: string;
    /** {count} */
    count: string;
    notFound: string;
    buy: string;
    buyOnWhatsapp: string;
    /** {business} */
    whatsappNotice: string;
    onSale: string;
    madeToOrder: string;
    /** {count} {value} */
    installment: string;
    interestFree: string;
    paymentMethods: string;
    noImage: string;
  };
  services: {
    title: string;
    /** {count} */
    count: string;
    notFound: string;
    quote: string;
    /** {business} */
    whatsappNotice: string;
    cardLink: string;
  };
  detail: {
    description: string;
    specs: string;
  };
  gallery: {
    title: string;
  };
}

export interface SiteConfig {
  name: string;
  locale: string;
  /** código ISO 4217, ex.: BRL, USD */
  currency: string;
  brand: {
    logo?: SiteLogo;
    /** texto ao lado do logo; sem logo e sem texto, usa o name */
    logoText?: string;
  };
  seo: {
    title: string;
    titleTemplate: string;
    description?: string;
  };
  whatsapp: {
    // formato internacional, só dígitos (ex.: 5551999999999)
    phone: string;
    /** modelos de mensagem; {name} e {price} são substituídos */
    messages: {
      general: string;
      product: string;
      service: string;
    };
  };
  images: {
    /** hosts externos liberados para next/image (vira remotePatterns) */
    remoteHosts: string[];
  };
  theme: {
    colorMode: ColorMode;
  };
  menu: MenuItem[];
  home: {
    slides: HomeSlide[];
  };
  texts: SiteTexts;
}
