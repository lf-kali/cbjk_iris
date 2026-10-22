// Rota fina: a página é do core (@cbjk_iris/core/app/services/detail). Na E6 passa a ser gerada pelo iris sync.
export { default, generateStaticParams, generateMetadata } from "@cbjk_iris/core/app/services/detail";
// só os slugs de content/ existem: slug desconhecido é 404, sem ler content/ em tempo de execução
export const dynamicParams = false;
