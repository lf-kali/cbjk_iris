import { productCatalog } from "../../catalog/products";
import { siteConfig } from "../../lib/config";
import { fillTemplate } from "../../lib/format";
import { CatalogCard } from "../../products/CatalogCard";

const texts = siteConfig.texts.products;

export const metadata = {
  title: texts.title,
};

export default async function ProdutosPage() {
  const products = await productCatalog.list();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{texts.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fillTemplate(texts.count, { count: products.length })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <CatalogCard key={product.slug} product={product} />
        ))}
      </div>
    </main>
  );
}
