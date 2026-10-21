export interface Spec {
  label: string;
  value: string;
}

export interface Installment {
  /** Número de parcelas, ex: 10 */
  count: number;
  /** Valor de cada parcela */
  value: number;
  /** Se as parcelas têm juros. false = "sem juros" */
  hasInterest?: boolean;
}

interface CatalogItemBase {
  slug: string;
  name: string;
  /** Frase curta exibida nos cards e no topo da página de detalhe */
  shortDescription: string;
  /** Texto completo exibido na página de detalhe */
  description: string;
  images: string[];
  specs?: Spec[];
}

export interface Product extends CatalogItemBase {
  kind: "product";
  category: string;
  /** Preço à vista */
  price: number;
  /** Preço "de", caso esteja em promoção */
  originalPrice?: number;
  installment?: Installment;
  /** 0 = sob encomenda */
  stockQty: number;
}

export interface Service extends CatalogItemBase {
  kind: "service";
}

export type CatalogItem = Product | Service;

export interface ProductFilter {
  /** Comparação exata, sem diferenciar maiúsculas */
  category?: string;
  /** Remove um produto pelo slug (útil para "relacionados") */
  excludeSlug?: string;
  limit?: number;
}
