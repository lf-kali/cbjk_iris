import { Fragment, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

import type { CatalogItem } from "@cbjk_iris/schema";
import { siteConfig } from "../lib/config";
import { ImageGallery } from "./ImageGallery";

export type Crumb = { label: string; href: string };

// Página de detalhe genérica. O que é próprio de cada módulo (badge, preço,
// botão, aviso) chega pronto pelas props, então este componente não depende
// de produtos nem de serviços e sobrevive à remoção de qualquer um deles.
export function CatalogDetail({
  item,
  crumbs,
  badge,
  price,
  action,
  notice,
}: {
  item: CatalogItem;
  crumbs: Crumb[];
  badge?: ReactNode;
  price?: ReactNode;
  action: ReactNode;
  notice?: string;
}) {
  const { texts } = siteConfig;

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
          {badge}

          <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
          <p className="text-sm text-muted-foreground">{item.shortDescription}</p>

          <Separator />

          {price}
          {action}

          {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
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
