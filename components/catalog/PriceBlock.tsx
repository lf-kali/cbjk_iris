import type { Product } from "@/types/catalog";
import { siteConfig } from "@/site.config";
import { fillTemplate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// md (card da grade) mostra o preço "de" na mesma linha; sm e lg, acima.
const SIZES = {
  sm: { prices: "flex flex-col", original: "text-xs", price: "text-sm", note: "text-[11px]" },
  md: { prices: "flex flex-wrap items-baseline gap-x-2", original: "text-xs", price: "text-lg", note: "text-xs" },
  lg: { prices: "flex flex-col gap-1", original: "text-sm", price: "text-3xl", note: "text-sm" },
};

export function PriceBlock({
  product,
  size = "md",
  className,
}: {
  product: Product;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const texts = siteConfig.texts.products;
  const s = SIZES[size];
  const onSale = isOnSale(product);
  const { installment } = product;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={s.prices}>
        {onSale && (
          <span className={cn(s.original, "text-muted-foreground line-through")}>
            {formatPrice(product.originalPrice!)}
          </span>
        )}
        <span className={cn(s.price, "font-semibold text-foreground")}>{formatPrice(product.price)}</span>
      </div>
      <span className={cn(s.note, "text-muted-foreground")}>
        {installment
          ? fillTemplate(texts.installment, { count: installment.count, value: formatPrice(installment.value) }) +
            (installment.hasInterest === false ? ` ${texts.interestFree}` : "")
          : texts.paymentMethods}
      </span>
    </div>
  );
}

export function isOnSale(product: Product): boolean {
  return typeof product.originalPrice === "number" && product.originalPrice > product.price;
}
