import { Fragment } from "react";
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

import type { CatalogItem } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { fillTemplate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { whatsappUrlFor } from "@/lib/whatsapp";
import { ImageGallery } from "./ImageGallery";
import { PriceBlock } from "./PriceBlock";
import { WhatsappButton } from "./WhatsappButton";

type Crumb = { label: string; href: string };

// Página de detalhe compartilhada por produtos e serviços.
export function CatalogDetail({ item }: { item: CatalogItem }) {
  const { texts } = siteConfig;
  const isProduct = item.kind === "product";
  const kindTexts = isProduct ? texts.products : texts.services;

  const crumbs: Crumb[] = isProduct
    ? [
        { label: texts.products.title, href: routes.products },
        { label: item.category, href: `${routes.products}?categoria=${encodeURIComponent(item.category)}` },
      ]
    : [{ label: texts.services.title, href: routes.services }];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          {crumbs.map((crumb) => (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{item.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 md:grid-cols-2">
        <ImageGallery images={item.images} alt={item.name} />

        <div className="flex flex-col gap-4">
          {isProduct && !item.stockQty && (
            <Badge className="w-fit bg-primary text-primary-foreground">{texts.products.madeToOrder}</Badge>
          )}

          <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
          <p className="text-sm text-muted-foreground">{item.shortDescription}</p>

          <Separator />

          {isProduct && <PriceBlock product={item} size="lg" className="gap-1" />}

          <WhatsappButton
            href={whatsappUrlFor(item)}
            label={isProduct ? texts.products.buyOnWhatsapp : texts.services.quote}
          />

          <p className="text-xs text-muted-foreground">
            {fillTemplate(kindTexts.whatsappNotice, { business: siteConfig.name })}
          </p>
        </div>
      </div>

      <Tabs defaultValue="descricao" className="mt-12">
        <TabsList>
          <TabsTrigger value="descricao">{texts.detail.description}</TabsTrigger>
          {item.specs && <TabsTrigger value="especificacoes">{texts.detail.specs}</TabsTrigger>}
        </TabsList>

        <TabsContent value="descricao" className="text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </TabsContent>

        {item.specs && (
          <TabsContent value="especificacoes">
            <dl className="divide-y divide-border text-sm">
              {item.specs.map((spec) => (
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
