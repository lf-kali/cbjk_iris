import type { Section, SiteLink } from "./sections";

export interface MenuItem {
  title: string;
  path?: string;
  children?: MenuItem[];
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

export const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "cta", "cta-foreground", "highlight", "highlight-foreground",
  "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground",
  "destructive", "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ColorTokens = Record<ColorToken, string>;

/**
 * Cores da marca, aplicadas por cima do tema. Todas opcionais: em branco, vale a cor do tema.
 * Aceita qualquer cor CSS: "#1d4ed8", "oklch(55% 0.2 260)", "rgb(...)".
 */
export interface BrandColors {
  /** cor principal (botões padrão, links de destaque) */
  primary?: string;
  /** botões de ação, como o WhatsApp; em branco = primary */
  cta?: string;
  /** badges de oferta e destaques pontuais; em branco = destructive do tema */
  highlight?: string;
}

/** Fonte do Google (nome exato, ex.: "Playfair Display") ou arquivos locais. */
export type BrandFont =
  | { google: string; weights?: string[] }
  | { local: { path: string; weight: string; style?: "normal" | "italic" }[] };

export interface BrandConfig {
  logo?: SiteLogo;
  /** texto ao lado do logo; sem logo e sem texto, usa o name */
  logoText?: string;
  colors: BrandColors;
  /** arredondamento base, ex.: "0.625rem"; em branco = o do tema */
  radius?: string;
  /**
   * Em branco = fonte do tema (--font-sans do arquivo em themes/).
   * Depois de mudar, rode "npm run brand:sync" (roda sozinho antes de dev e build).
   */
  fonts?: {
    sans?: BrandFont;
    /** em branco = mesma da sans */
    heading?: BrandFont;
  };
  /** sobrescreve qualquer variável final, por modo (ex.: colar trechos do tweakcn) */
  overrides?: {
    light?: Partial<ColorTokens>;
    dark?: Partial<ColorTokens>;
  };
}

export type SocialNetwork = "instagram" | "facebook" | "youtube" | "tiktok" | "whatsapp" | "x" | "pinterest" | "threads" | "linkedin";

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  /** linhas de horário, ex.: ["Seg a sex: 8h às 18h", "Sáb: 8h às 12h"] */
  hours?: string[];
  /** URL de "Incorporar um mapa" do Google Maps (src do iframe) */
  mapEmbedUrl?: string;
  social?: Partial<Record<SocialNetwork, string>>;
}

export interface FooterConfig {
  /** frase curta abaixo do logo */
  text?: string;
  /** colunas de links; em branco = links do menu principal */
  columns?: { title: string; links: SiteLink[] }[];
}

export interface PageConfig {
  /** caminho sem barra, ex.: "sobre" */
  slug: string;
  title: string;
  description?: string;
  sections: Section[];
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
    /** exibido quando não há fotos */
    empty: string;
  };
  sections: {
    seeAll: string;
    contact: {
      phone: string;
      email: string;
      address: string;
      hours: string;
      whatsapp: string;
      mapTitle: string;
    };
  };
  footer: {
    menu: string;
    contact: string;
    /** {year} {name} */
    copyright: string;
  };
}

export interface SiteConfig {
  name: string;
  locale: string;
  /** código ISO 4217, ex.: BRL, USD */
  currency: string;
  brand: BrandConfig;
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
    /** arquivo em themes/ (sem .css): paletas do shadcn, temas do tweakcn ou um colado à mão */
    name: string;
    colorMode: ColorMode;
  };
  menu: MenuItem[];
  /** dados de contato usados pela seção "contact" e pelo rodapé */
  contact?: ContactInfo;
  footer?: FooterConfig;
  home: {
    sections: Section[];
  };
  /** páginas extras montadas com seções, servidas em /<slug> (ex.: "sobre", "contato") */
  pages?: PageConfig[];
  texts: SiteTexts;
}
