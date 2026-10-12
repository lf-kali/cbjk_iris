export interface ProductInstallment {
  /** Número de parcelas, ex: 10 */
  count: number;
  /** Valor de cada parcela em reais */
  value: number;
  /** Se as parcelas têm juros. false = "sem juros" */
  hasInterest?: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  /** Preço à vista, em reais */
  price: number;
  /** Preço "de", caso esteja em promoção */
  originalPrice?: number;
  installment?: ProductInstallment;
  images: string[];
  shortDescription: string;
  description: string;
  specs?: ProductSpec[];
  stockQty: number;
}
