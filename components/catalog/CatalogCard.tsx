import Link from "next/link";
import Image from "next/image";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Product } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { itemHref } from "@/lib/routes";
import { whatsappUrlFor } from "@/lib/whatsapp";
import { PriceBlock } from "./PriceBlock";
import { ProductBadges } from "./ProductBadges";
import { WhatsappButton } from "./WhatsappButton";

// Card da grade de produtos. O botão do WhatsApp fica fora do <Link>
// (link dentro de link não é HTML válido).
export function CatalogCard({ product }: { product: Product }) {
  return (
    <Card className="group h-full overflow-hidden border-border py-0 transition-shadow hover:shadow-md">
      <Link href={itemHref(product)} className="flex flex-1 flex-col gap-4">
        <div className="relative">
          <AspectRatio ratio={1}>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </AspectRatio>
          <ProductBadges product={product} />
        </div>

        <CardContent className="flex flex-col gap-1 px-4 pt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{product.category}</span>
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</h3>
          <PriceBlock product={product} className="mt-1" />
        </CardContent>
      </Link>

      <CardFooter className="px-4 pb-4">
        <WhatsappButton href={whatsappUrlFor(product)} label={siteConfig.texts.products.buy} size="sm" />
      </CardFooter>
    </Card>
  );
}
