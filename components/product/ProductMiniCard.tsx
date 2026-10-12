import Link from "next/link";
import type { Product } from "@/types/product";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ProductMiniCardProps {
  product: Product;
  /** Rota base do produto individual. Ajuste se a sua rota for diferente. */
  hrefBase?: string;
}

export function ProductMiniCard({
  product,
  hrefBase = "/produto",
}: ProductMiniCardProps) {
  const hasDiscount =
    typeof product.originalPrice === "number" &&
    product.originalPrice > product.price;

  return (
    <Link
      href={`${hrefBase}/${product.slug}`}
      className="group flex h-80 w-[168px] shrink-0 snap-start flex-col gap-2 rounded-xs border border-border bg-card p-2 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 sm:w-[188px]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xs bg-neutral-100">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-[#ff741d] px-2 py-0.5 text-[10px] font-medium text-white">
            Oferta
          </span>
        )}

        {!product.stockQty && (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
            Sob Encomenda
          </span>
        )}
      </div>

      <div className="flex flex-col h-5/12 justify-between gap-0.5 px-0.5 pb-1">
        <div>
            <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
          {product.category}
        </span>
        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {product.name}
        </span>
        </div>

        <div className="mt-1 flex flex-col">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {currencyFormatter.format(product.originalPrice as number)}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">
            {currencyFormatter.format(product.price)}
          </span>
          {product.installment ? (
            <span className="text-[11px] text-muted-foreground">
              {product.installment.count}x de{" "}
              {currencyFormatter.format(product.installment.value)}
              {product.installment.hasInterest === false && " sem juros"}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
                Pix, Débito ou Crédito
            </span>
          )
          }
        </div>
      </div>
    </Link>
  );
}