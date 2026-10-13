import type { Product } from "@/types/catalog";

export const products: Product[] = [
  {
    kind: "product",
    slug: "porcelanato-marmo-carrara-90x90",
    name: "Porcelanato Mármore Carrara 90x90",
    category: "Pisos e Revestimentos",
    price: 189.9,
    originalPrice: 229.9,
    installment: { count: 10, value: 18.99, hasInterest: false },
    images: [
      "/products/porcelanato-marmore-1.jpg",
      "/products/porcelanato-marmore-2.jpg",
      "/products/porcelanato-marmore-3.jpg",
    ],
    shortDescription: "Acabamento polido, efeito mármore, alta resistência a tráfego.",
    description:
      "Porcelanato de grande formato com efeito mármore Carrara, acabamento polido e retificado. Indicado para salas, halls de entrada e áreas comerciais que exigem alto padrão estético com baixa manutenção.",
    specs: [
      { label: "Dimensões", value: "90 x 90 cm" },
      { label: "Acabamento", value: "Polido" },
      { label: "PEI", value: "5 (alto tráfego)" },
      { label: "Caixa", value: "2 peças / 1,62 m²" },
    ],
    stockQty: 10,
  },
  {
    kind: "product",
    slug: "torneira-monocomando-bancada-preta",
    name: "Torneira Monocomando de Bancada Preto Fosco",
    category: "Metais e Louças",
    price: 349.0,
    installment: { count: 6, value: 58.16, hasInterest: false },
    images: ["/products/torneira-1.jpg", "/products/torneira-2.jpg"],
    shortDescription: "Design minimalista, acabamento preto fosco, bica alta.",
    description:
      "Torneira monocomando para bancada com bica alta, ideal para cubas de apoio. Estrutura em metal cromado com pintura preto fosco de alta durabilidade, arejador removível para fácil limpeza.",
    specs: [
      { label: "Material", value: "Metal cromado" },
      { label: "Acabamento", value: "Preto fosco" },
      { label: "Tipo", value: "Monocomando" },
      { label: "Garantia", value: "5 anos" },
    ],
    stockQty: 10,
  },
  {
    kind: "product",
    slug: "luminaria-pendente-industrial-cobre",
    name: "Luminária Pendente Industrial Cobre",
    category: "Iluminação",
    price: 219.9,
    installment: { count: 4, value: 54.98, hasInterest: false },
    images: ["/products/luminaria-pendente-1.jpg"],
    shortDescription: "Estilo industrial, cúpula em metal cobre escovado.",
    description:
      "Pendente com cúpula em metal cobre escovado, indicado para mesas de jantar, balcões e bancadas. Compatível com lâmpadas E27 (não inclusas).",
    specs: [
      { label: "Material", value: "Metal escovado" },
      { label: "Soquete", value: "E27" },
      { label: "Altura do cabo", value: "Ajustável até 1,5 m" },
    ],
    stockQty: 0,
  },
  {
    kind: "product",
    slug: "rodape-poliestireno-liso-10cm",
    name: "Rodapé em Poliestireno Liso 10cm (barra 2,4m)",
    category: "Acabamentos Gerais",
    price: 34.9,
    images: ["/products/rodape-1.jpg"],
    shortDescription: "Leve, resistente à umidade, fácil instalação com cola.",
    description:
      "Rodapé liso em poliestireno de alta densidade, não empena e não é atacado por cupim. Instalação simples com cola de contato, sem necessidade de furos ou parafusos.",
    specs: [
      { label: "Altura", value: "10 cm" },
      { label: "Comprimento da barra", value: "2,40 m" },
      { label: "Material", value: "Poliestireno" },
    ],
    stockQty: 10,
  },
];
