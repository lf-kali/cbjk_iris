import type { Product } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { Badge } from "@/components/ui/badge";
import { isOnSale } from "./PriceBlock";

// Badges sobre a imagem: sob encomenda à esquerda, oferta à direita.
export function ProductBadges({ product }: { product: Product }) {
  const texts = siteConfig.texts.products;

  return (
    <>
      {!product.stockQty && (
        <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">{texts.madeToOrder}</Badge>
      )}
      {isOnSale(product) && (
        <Badge className="absolute right-2 top-2 bg-highlight text-highlight-foreground">{texts.onSale}</Badge>
      )}
    </>
  );
}
