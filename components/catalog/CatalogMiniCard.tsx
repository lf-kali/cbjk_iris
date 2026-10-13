import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { itemHref } from "@/lib/routes";
import { PriceBlock } from "./PriceBlock";
import { ProductBadges } from "./ProductBadges";

export function CatalogMiniCard({ product }: { product: Product }) {
  return (
    <Link
      href={itemHref(product)}
      className="group flex h-80 w-[168px] shrink-0 snap-start flex-col gap-2 rounded-xs border border-border bg-card p-2 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[188px]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xs bg-muted">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="188px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {siteConfig.texts.products.noImage}
          </div>
        )}
        <ProductBadges product={product} />
      </div>

      <div className="flex flex-col h-5/12 justify-between gap-0.5 px-0.5 pb-1">
        <div>
          <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.name}</span>
        </div>
        <PriceBlock product={product} size="sm" className="mt-1" />
      </div>
    </Link>
  );
}
