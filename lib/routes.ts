import type { CatalogItem } from "@/types/catalog";

export const routes = {
  products: "/produtos",
  services: "/servicos",
} as const;

export function itemHref(item: CatalogItem): string {
  return item.kind === "product" ? `/produto/${item.slug}` : `/servico/${item.slug}`;
}
