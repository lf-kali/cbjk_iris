import type { Service } from "@/types/service";

export const services: Service[] = [
  {
    slug: "instalacao-porcelanato",
    name: "Instalação de Porcelanato",
    shortDescription:
      "Assentamento nivelado com espaçador, rejunte e acabamento de bordas incluso.",
    description:
      "Equipe especializada em assentamento de porcelanato de qualquer formato, incluindo grandes formatos que exigem nivelamento a laser. O serviço inclui preparação do contrapiso, aplicação de argamassa AC-III, nivelamento com espaçadores niveladores e rejuntamento.",
    images: [
      "/services/instalacao-porcelanato-1.jpg",
      "/services/instalacao-porcelanato-2.jpg",
      "/services/instalacao-porcelanato-3.jpg",
    ],
    specs: [
      { label: "Prazo médio", value: "3 a 7 dias, conforme metragem" },
      { label: "Garantia do serviço", value: "12 meses" },
      { label: "Material", value: "Não incluso (orçado à parte)" },
    ],
  },
  {
    slug: "instalacao-hidraulica",
    name: "Instalação Hidráulica",
    shortDescription:
      "Troca de tubulações, registros e conexões para banheiros e cozinhas.",
    description:
      "Serviço completo de instalação e reparo hidráulico, incluindo troca de tubulações antigas, instalação de registros, válvulas de descarga e conexões para louças e metais. Atendimento também para reformas parciais e vazamentos.",
    images: ["/services/instalacao-hidraulica-1.jpg", "/services/instalacao-hidraulica-2.jpg"],
    specs: [
      { label: "Prazo médio", value: "1 a 3 dias" },
      { label: "Garantia do serviço", value: "6 meses" },
      { label: "Visita técnica", value: "Necessária para orçamento fechado" },
    ],
  },
  {
    slug: "instalacao-eletrica",
    name: "Instalação Elétrica",
    shortDescription:
      "Pontos de luz, tomadas, quadro de disjuntores e adequação às normas vigentes.",
    description:
      "Instalação e adequação de sistemas elétricos residenciais e comerciais, com dimensionamento correto de fiação, disjuntores e aterramento. Inclui criação de novos pontos, substituição de quadro de distribuição e laudos técnicos quando necessário.",
    images: ["/services/instalacao-eletrica-1.jpg", "/services/instalacao-eletrica-2.jpg"],
    specs: [
      { label: "Prazo médio", value: "2 a 5 dias, conforme escopo" },
      { label: "Garantia do serviço", value: "12 meses" },
      { label: "Normas", value: "NBR 5410" },
    ],
  },
  {
    slug: "gesso-e-drywall",
    name: "Gesso e Drywall",
    shortDescription:
      "Forros, sancas, divisórias e acabamentos em gesso liso ou drywall.",
    description:
      "Execução de forros de gesso, sancas para iluminação indireta, divisórias em drywall e rebaixamentos. Acabamento liso pronto para pintura, com atenção especial a alinhamento e vãos para climatização e iluminação embutida.",
    images: ["/services/gesso-drywall-1.jpg", "/services/gesso-drywall-2.jpg"],
    specs: [
      { label: "Prazo médio", value: "3 a 6 dias, conforme metragem" },
      { label: "Garantia do serviço", value: "12 meses" },
    ],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}
