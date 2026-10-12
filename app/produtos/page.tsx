import { products } from "@/data/products";
import { ProductCard } from "@/components/product-card";

export const metadata = {
  title: "Produtos | JR Acabamentos",
};

export default function ProdutosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-Foreground">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.length} produtos disponíveis
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </main>
  );
}
