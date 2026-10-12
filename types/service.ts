export interface ServiceSpec {
  label: string;
  value: string;
}

export interface Service {
  slug: string;
  name: string;
  /** Frase curta exibida no card da listagem */
  shortDescription: string;
  /** Texto completo exibido na página de detalhe */
  description: string;
  /** Fotos usadas no carrossel do card e na galeria da página de detalhe */
  images: string[];
  specs?: ServiceSpec[];
}
