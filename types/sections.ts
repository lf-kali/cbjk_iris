// Blocos configuráveis que compõem a home e as páginas definidas no site.config.ts.
// Cada tipo é renderizado por um componente registrado em components/sections/registry.tsx
// (gerado a partir do modules.json: seções do núcleo + seções dos módulos ativos).

/** Link de botão: rota/URL ou WhatsApp (true = mensagem geral; texto = mensagem própria). */
export type SiteLink = { label: string } & ({ href: string } | { whatsapp: true | string });

/** Ícones disponíveis para benefícios (lista fixa do lucide, ver components/sections/icons.ts). */
export const SECTION_ICONS = [
  "shield-check", "badge-check", "award", "star", "thumbs-up", "heart", "gem",
  "clock", "timer", "calendar", "truck", "package", "credit-card", "hand-coins",
  "wrench", "hammer", "ruler", "paint-roller", "house", "zap", "droplets", "lightbulb",
  "leaf", "recycle", "users", "headset", "phone", "message-circle", "map-pin", "sparkles",
] as const;
export type SectionIcon = (typeof SECTION_ICONS)[number];

interface SectionBase {
  /** âncora para links (#id) */
  id?: string;
  title?: string;
  subtitle?: string;
}

export interface HeroSlide {
  image: string;
  alt: string;
  title: string;
  subtitle?: string;
  /** botão principal do slide */
  cta?: SiteLink;
  /** segundo botão, com estilo discreto */
  secondaryCta?: SiteLink;
  /** torna o slide inteiro clicável (útil para banners de promoção sem botão) */
  href?: string;
  /** posição do texto */
  align?: "left" | "center" | "right";
}

export type HeroSection = {
  type: "hero";
  id?: string;
  slides: HeroSlide[];
  autoplay?: boolean;
  /** ms entre slides */
  interval?: number;
  height?: "sm" | "md" | "lg" | "full";
};

export type BenefitsSection = SectionBase & {
  type: "benefits";
  items: { icon: SectionIcon; title: string; text: string }[];
};

export type TextImageSection = SectionBase & {
  type: "text-image";
  /** parágrafos separados por linha em branco */
  text: string;
  image: string;
  imageAlt: string;
  imageSide?: "left" | "right";
  cta?: SiteLink;
};

export type CtaBannerSection = SectionBase & {
  type: "cta-banner";
  text?: string;
  cta: SiteLink;
  /** cor de fundo: primária, cor de ação ou discreta */
  tone?: "primary" | "cta" | "muted";
};

export type TestimonialsSection = SectionBase & {
  type: "testimonials";
  items: { name: string; text: string; role?: string; rating?: 1 | 2 | 3 | 4 | 5; image?: string }[];
};

export type StatsSection = SectionBase & {
  type: "stats";
  items: { value: string; label: string }[];
};

export type FaqSection = SectionBase & {
  type: "faq";
  items: { question: string; answer: string }[];
};

export type ContactSection = SectionBase & {
  type: "contact";
  /** mostra o mapa de siteConfig.contact.mapEmbedUrl */
  showMap?: boolean;
};

// Seções dos módulos: somem junto com o módulo (ver modules.json).
export type ProductsSection = SectionBase & { type: "products"; category?: string; limit?: number };
export type ServicesSection = SectionBase & { type: "services"; limit?: number };
export type GallerySection = SectionBase & { type: "gallery"; limit?: number };

export type Section =
  | HeroSection
  | BenefitsSection
  | TextImageSection
  | CtaBannerSection
  | TestimonialsSection
  | StatsSection
  | FaqSection
  | ContactSection
  | ProductsSection
  | ServicesSection
  | GallerySection;

export type SectionOf<T extends Section["type"]> = Extract<Section, { type: T }>;
