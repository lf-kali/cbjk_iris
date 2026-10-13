import type { HomeSection } from "@/types/site-config";
import { productCatalog } from "@/lib/catalog/products";
import { ProductScrollList } from "./ProductScrollList";

// Seção "products" da home: lista horizontal de produtos.
export async function ProductsSection({ section }: { section: Extract<HomeSection, { type: "products" }> }) {
  const products = await productCatalog.list({ category: section.category, limit: section.limit });
  return <ProductScrollList products={products} title={section.title} className="p-4.5" />;
}
