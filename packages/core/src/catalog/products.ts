import { loadProducts } from "@cbjk_iris/engine/content";
import type { Product, ProductFilter } from "@cbjk_iris/schema";

// Contrato da fonte de produtos. As páginas só conhecem esta interface;
// para usar uma API ou banco, implemente-a e troque `productCatalog`.
// A implementação padrão lê content/products/<slug>.json pelo loader do engine (SPEC §5.3):
// só servidor (fs e zod). get() procura na lista: o slug da URL nunca vira caminho de arquivo.
export interface ProductRepository {
  list(filter?: ProductFilter): Promise<Product[]>;
  get(slug: string): Promise<Product | undefined>;
  categories(): Promise<string[]>;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

const contentProducts: ProductRepository = {
  async list(filter = {}) {
    let result = await loadProducts();

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
    return (await loadProducts()).find((product) => product.slug === slug);
  },

  async categories() {
    return [...new Set((await loadProducts()).map((product) => product.category))];
  },
};

export const productCatalog: ProductRepository = contentProducts;
