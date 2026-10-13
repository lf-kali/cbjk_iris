"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Product } from "@/types/product";
import { formatBRL } from "@/lib/format";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export function ProductCard({ product }: { product: Product }) {
  const onSale = product.originalPrice && product.originalPrice > product.price;

  function handleBuyClick(event: React.MouseEvent) {
    // impede que o clique no botão dispare a navegação do Link que envolve o card
    event.preventDefault();
    event.stopPropagation();
    window.open(buildWhatsappUrl(product), "_blank", "noopener,noreferrer");
  }

  return (
    <Link href={`/produto/${product.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border py-0 transition-shadow hover:shadow-md">
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
          {!product.stockQty && (
            <Badge variant="secondary" className="absolute left-2 top-2 bg-primary text-primary-foreground">
              Sob encomenda
            </Badge>
          )}
          {onSale && (
            <Badge className="absolute right-2 top-2 bg-highlight text-highlight-foreground">
              Oferta
            </Badge>
          )}
        </div>

        <CardContent className="flex flex-col gap-1 px-4 pt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">
            {product.name}
          </h3>

          <div className="mt-1 flex items-baseline gap-2">
            {onSale && (
              <span className="text-xs text-muted-foreground line-through">
                {formatBRL(product.originalPrice!)}
              </span>
            )}
            <span className="text-lg font-semibold text-foreground">
              {formatBRL(product.price)}
            </span>
          </div>

          {product.installment ? (
            <span className="text-xs text-muted-foreground">
              ou {product.installment.count}x de {formatBRL(product.installment.value)}
              {product.installment.hasInterest === false ? " sem juros" : ""}
            </span>
          ):
          (
            <span className="text-xs text-muted-foreground">
              Pix, Débitoou Crédito
            </span>
          )}
        </CardContent>

        <CardFooter className="px-4 pb-4">
          <Button
            onClick={handleBuyClick}
            size="sm"
            variant="cta"
            className="w-full gap-2"
          >
            <MessageCircle className="size-4" />
            Comprar agora
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
