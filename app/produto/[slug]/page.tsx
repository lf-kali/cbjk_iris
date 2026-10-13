import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { productCatalog } from "@/lib/catalog/products";
import { siteConfig } from "@/site.config";
import { fillTemplate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { whatsappUrlFor } from "@/lib/whatsapp";
import { CatalogDetail } from "@/components/catalog/CatalogDetail";
import { WhatsappButton } from "@/components/catalog/WhatsappButton";
import { PriceBlock } from "@/components/products/PriceBlock";

const texts = siteConfig.texts.products;

export async function generateStaticParams() {
  const products = await productCatalog.list();
  return products.map((product) => ({ slug: product.slug }));
}

type ProdutoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = await productCatalog.get(slug);
  return { title: product ? product.name : texts.notFound };
}

export default async function ProdutoPage({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = await productCatalog.get(slug);
  if (!product) notFound();

  return (
    <CatalogDetail
      item={product}
      crumbs={[
        { label: texts.title, href: routes.products },
        { label: product.category, href: `${routes.products}?categoria=${encodeURIComponent(product.category)}` },
      ]}
      badge={
        !product.stockQty && (
          <Badge className="w-fit bg-primary text-primary-foreground">{texts.madeToOrder}</Badge>
        )
      }
      price={<PriceBlock product={product} size="lg" className="gap-1" />}
      action={<WhatsappButton href={whatsappUrlFor(product)} label={texts.buyOnWhatsapp} />}
      notice={fillTemplate(texts.whatsappNotice, { business: siteConfig.name })}
    />
  );
}
