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

export interface SiteConfig {
  name: string;
  locale: string;
  seo: {
    title: string;
    titleTemplate: string;
    description?: string;
  };
  whatsapp: {
    // formato internacional, só dígitos (ex.: 5551999999999)
    phone: string;
  };
  theme: {
    colorMode: ColorMode;
  };
  menu: MenuItem[];
  home: {
    slides: HomeSlide[];
  };
}
