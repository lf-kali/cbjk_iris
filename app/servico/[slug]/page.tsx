import { notFound } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getServiceBySlug, services } from "@/data/services";
import { ProductGallery } from "@/components/product-gallery";
import { QuoteButton } from "@/components/quote-button";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

type ServicoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  return { title: service ? `${service.name} | JR Acabamentos` : "Serviço não encontrado" };
}

export default async function ServicoPage({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/servicos">Serviços</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{service.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={service.images} alt={service.name} />

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-foreground">{service.name}</h1>
          <p className="text-sm text-muted-foreground">{service.shortDescription}</p>

          <Separator />

          <QuoteButton service={service} />

          <p className="text-xs text-muted-foreground">
            Você será direcionado ao WhatsApp da JR Acabamentos com uma mensagem já preenchida
            para pedir seu orçamento.
          </p>
        </div>
      </div>

      <Tabs defaultValue="descricao" className="mt-12">
        <TabsList>
          <TabsTrigger value="descricao">Descrição</TabsTrigger>
          {service.specs && <TabsTrigger value="especificacoes">Especificações</TabsTrigger>}
        </TabsList>

        <TabsContent value="descricao" className="text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </TabsContent>

        {service.specs && (
          <TabsContent value="especificacoes">
            <dl className="divide-y divide-border text-sm">
              {service.specs.map((spec) => (
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
