// Gerado por scripts/sync-modules.mjs a partir de modules.json. Não edite à mão:
// rode "npm run modules:sync" depois de adicionar ou remover um módulo.
import type { HomeSectionRegistry } from "@/types/home-sections";
import { ProductsSection } from "@/components/products/ProductsSection";

export const homeSections: HomeSectionRegistry = {
  products: ProductsSection,
};
