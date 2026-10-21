import Link from "next/link";
import type { ProductsSection as ProductsSectionConfig } from "@cbjk_iris/schema";
import { siteConfig } from "../lib/config";
import { productCatalog } from "../catalog/products";
import { routes } from "../lib/routes";
import { SectionShell } from "../sections/SectionShell";
import { ProductScrollList } from "./ProductScrollList";

// Seção "products": lista horizontal de produtos, com link para o catálogo.
export async function ProductsSection({ section }: { section: ProductsSectionConfig }) {
  const products = await productCatalog.list({ category: section.category, limit: section.limit });
  if (products.length === 0) return null;

  return (
    <SectionShell
      id={section.id}
      title={section.title}
      subtitle={section.subtitle}
      action={<Link href={routes.products} className="text-sm font-medium text-primary hover:underline">{siteConfig.texts.sections.seeAll} →</Link>}
    >
      <ProductScrollList products={products} />
    </SectionShell>
  );
}
