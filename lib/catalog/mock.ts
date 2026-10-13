import { products } from "@/data/products";
import { services } from "@/data/services";
import type { CatalogRepository } from "./repository";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export const mockCatalog: CatalogRepository = {
  async listProducts(filter = {}) {
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

  async getProduct(slug) {
    return products.find((product) => product.slug === slug);
  },

  async listProductCategories() {
    return [...new Set(products.map((product) => product.category))];
  },

  async listServices() {
    return services;
  },

  async getService(slug) {
    return services.find((service) => service.slug === slug);
  },
};
