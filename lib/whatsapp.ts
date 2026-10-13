import type { CatalogItem } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { fillTemplate, formatPrice } from "@/lib/format";

export function whatsappUrl(message: string = siteConfig.whatsapp.messages.general): string {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${siteConfig.whatsapp.phone}?${params.toString()}`;
}

export function whatsappUrlFor(item: CatalogItem): string {
  const { messages } = siteConfig.whatsapp;
  const message =
    item.kind === "product"
      ? fillTemplate(messages.product, { name: item.name, price: formatPrice(item.price) })
      : fillTemplate(messages.service, { name: item.name });
  return whatsappUrl(message);
}
