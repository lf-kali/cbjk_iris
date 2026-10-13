import { notFound } from "next/navigation";
import { catalog } from "@/lib/catalog";
import { siteConfig } from "@/site.config";
import { CatalogDetail } from "@/components/catalog/CatalogDetail";

export async function generateStaticParams() {
  const products = await catalog.listProducts();
  return products.map((product) => ({ slug: product.slug }));
}

type ProdutoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = await catalog.getProduct(slug);
  return { title: product ? product.name : siteConfig.texts.products.notFound };
}

export default async function ProdutoPage({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = await catalog.getProduct(slug);
  if (!product) notFound();

  return <CatalogDetail item={product} />;
}
