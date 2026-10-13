import type { NeutralScaleName } from "@/lib/brand-scales";

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

// Seções da home, renderizadas na ordem da lista. Cada tipo é fornecido por um
// módulo (ver modules.json); um tipo novo entra nesta união.
export type HomeSection = {
  type: "products";
  title?: string;
  category?: string;
  limit?: number;
};

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

export interface BrandColors {
  /** escala de cinzas do Tailwind que dá o tom de fundos, bordas e textos secundários */
  neutral: NeutralScaleName;
  /** cor principal (botões padrão, destaques); omitida = tom 900 da escala neutra */
  primary?: string;
  /** botões de ação, como o WhatsApp */
  cta: string;
  /** badges de oferta e destaques pontuais */
  highlight: string;
}

/** Fonte do Google (nome exato, ex.: "Playfair Display") ou arquivos locais. */
export type BrandFont =
  | { google: string; weights?: string[] }
  | { local: { path: string; weight: string; style?: "normal" | "italic" }[] };

export interface BrandConfig {
  logo?: SiteLogo;
  /** texto ao lado do logo; sem logo e sem texto, usa o name */
  logoText?: string;
  /** qualquer cor CSS: "#1d4ed8", "oklch(55% 0.2 260)", "rgb(...)" */
  colors: BrandColors;
  /** arredondamento base, ex.: "0.625rem" */
  radius?: string;
  /** depois de mudar, rode "npm run brand:sync" (roda sozinho antes de dev e build) */
  fonts: {
    sans: BrandFont;
    /** omitida = mesma da sans */
    heading?: BrandFont;
  };
  /** sobrescreve variáveis derivadas, por modo */
  overrides?: {
    light?: Partial<ColorTokens>;
    dark?: Partial<ColorTokens>;
  };
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
    colorMode: ColorMode;
  };
  menu: MenuItem[];
  home: {
    slides: HomeSlide[];
    sections: HomeSection[];
  };
  texts: SiteTexts;
}
