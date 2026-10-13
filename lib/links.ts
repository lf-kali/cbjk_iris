import type { SiteLink } from "@/types/sections";
import { whatsappUrl } from "@/lib/whatsapp";

/** Resolve um SiteLink do config: rota interna, URL externa ou conversa no WhatsApp. */
export function resolveLink(link: SiteLink): { href: string; external: boolean } {
  if ("whatsapp" in link) {
    return { href: link.whatsapp === true ? whatsappUrl() : whatsappUrl(link.whatsapp), external: true };
  }
  return { href: link.href, external: /^(https?:|mailto:|tel:)/.test(link.href) };
}
