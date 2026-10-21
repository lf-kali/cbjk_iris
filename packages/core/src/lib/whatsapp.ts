import type { CatalogItem } from "@cbjk_iris/schema";
import { siteConfig } from "./config";
import { fillTemplate, formatPrice } from "./format";

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
