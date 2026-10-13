import type { SiteConfig } from "@/types/site-config";

export const siteConfig: SiteConfig = {
  name: "JR Acabamentos",
  locale: "pt-BR",
  seo: {
    title: "JR - Acabamentos de alto padrão",
    titleTemplate: "%s | JR Acabamentos",
  },
  whatsapp: {
    // TODO: substituir pelo número real da JR Acabamentos
    phone: "5551999999999",
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
};
