import type { Product, ProductFilter, Service } from "@/types/catalog";

// Contrato da fonte de dados do catálogo. As páginas só conhecem esta interface;
// trocar o mock por uma API ou banco é implementar estes métodos.
export interface CatalogRepository {
  listProducts(filter?: ProductFilter): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | undefined>;
  listProductCategories(): Promise<string[]>;
  listServices(): Promise<Service[]>;
  getService(slug: string): Promise<Service | undefined>;
}
