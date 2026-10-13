import { notFound } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getProductBySlug, products } from "@/data/products";
import { ProductGallery } from "@/components/product-gallery";
import { BuyButton } from "@/components/buy-button";
import { formatBRL } from "@/lib/format";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

type ProdutoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? product.name : "Produto não encontrado" };
}

export default async function ProdutoPage({ params }: ProdutoPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const onSale = product.originalPrice && product.originalPrice > product.price;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/produtos">Produtos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/produtos?categoria=${encodeURIComponent(product.category)}`}>
              {product.category}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-4">
          {!product.stockQty && (
            <Badge variant="secondary" className="w-fit bg-primary text-primary-foreground">
              Sob encomenda
            </Badge>
          )}

          <h1 className="text-2xl font-semibold text-foreground">{product.name}</h1>
          <p className="text-sm text-muted-foreground">{product.shortDescription}</p>

          <Separator />

          <div className="flex flex-col gap-1">
            {onSale && (
              <span className="text-sm text-muted-foreground line-through">
                {formatBRL(product.originalPrice!)}
              </span>
            )}
            <span className="text-3xl font-semibold text-foreground">
              {formatBRL(product.price)}
            </span>
            {product.installment && (
              <span className="text-sm text-muted-foreground">
                ou {product.installment.count}x de {formatBRL(product.installment.value)}
                {product.installment.hasInterest === false ? " sem juros" : ""}
              </span>
            )}
          </div>

          <BuyButton product={product} />

          <p className="text-xs text-muted-foreground">
            Você será direcionado ao WhatsApp da JR Acabamentos com uma mensagem já preenchida
            para fechar os detalhes da compra.
          </p>
        </div>
      </div>

      <Tabs defaultValue="descricao" className="mt-12">
        <TabsList>
          <TabsTrigger value="descricao">Descrição</TabsTrigger>
          {product.specs && <TabsTrigger value="especificacoes">Especificações</TabsTrigger>}
        </TabsList>

        <TabsContent value="descricao" className="text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </TabsContent>

        {product.specs && (
          <TabsContent value="especificacoes">
            <dl className="divide-y divide-border text-sm">
              {product.specs.map((spec) => (
                <div key={spec.label} className="flex justify-between py-2">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}
