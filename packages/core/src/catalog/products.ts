import { products } from "./data/products";
import type { Product, ProductFilter } from "@cbjk_iris/schema";

// Contrato da fonte de produtos. As páginas só conhecem esta interface;
// para usar uma API ou banco, implemente-a e troque `productCatalog`.
export interface ProductRepository {
  list(filter?: ProductFilter): Promise<Product[]>;
  get(slug: string): Promise<Product | undefined>;
  categories(): Promise<string[]>;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

const mockProducts: ProductRepository = {
  async list(filter = {}) {
    let result = products;

    if (filter.category) {
      const category = normalize(filter.category);
      result = result.filter((product) => normalize(product.category) === category);
    }
    if (filter.excludeSlug) {
      result = result.filter((product) => product.slug !== filter.excludeSlug);
    }
    if (typeof filter.limit === "number") {
      result = result.slice(0, filter.limit);
    }

    return result;
  },

  async get(slug) {
    return products.find((product) => product.slug === slug);
  },

  async categories() {
    return [...new Set(products.map((product) => product.category))];
  },
};

export const productCatalog: ProductRepository = mockProducts;
