"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import type { Product } from "@cbjk_iris/schema";
import { CatalogMiniCard } from "./CatalogMiniCard";

const CARDS_PER_SCROLL = 3;

interface ProductScrollListProps {
  /** Produtos já filtrados (ex.: catalog.listProducts({ category, excludeSlug, limit })) */
  products: Product[];
  title?: string;
  className?: string;
  /** Mensagem exibida quando a lista vem vazia. Se omitida, a seção some. */
  emptyMessage?: string;
}

export function ProductScrollList({
  products,
  title = "",
  className,
  emptyMessage,
}: ProductScrollListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    updateArrowState();

    const el = scrollerRef.current;
    if (!el) return;

    // Recalcula se o container mudar de tamanho (resize, orientação, etc.)
    const resizeObserver = new ResizeObserver(updateArrowState);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [updateArrowState, products.length]);

  const getScrollStep = useCallback(() => {
    const el = scrollerRef.current;
    const card = firstCardRef.current;
    if (!el || !card) return el?.clientWidth ?? 0;

    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap || "0");
    const cardWidth = card.getBoundingClientRect().width;

    return (cardWidth + gap) * CARDS_PER_SCROLL;
  }, []);

  const scrollByCards = useCallback(
    (direction: "left" | "right") => {
      const el = scrollerRef.current;
      if (!el) return;

      const step = getScrollStep();
      el.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
    },
    [getScrollStep],
  );

  if (products.length === 0) {
    if (!emptyMessage) return null;

    return (
      <section className={cn("w-full", className)}>
        {title && (
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {title}
          </h2>
        )}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={cn("relative w-full", className)}>
      {title && (
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          {title}
        </h2>
      )}

      <div className="relative">
        {/* Seta esquerda */}
        <button
          type="button"
          aria-label="Ver produtos anteriores"
          onClick={() => scrollByCards("left")}
          disabled={!canScrollLeft}
          className={cn(
            "absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 shadow-md transition-opacity sm:flex",
            !canScrollLeft && "pointer-events-none opacity-0",
          )}
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>

        {/* Lista scrollável */}
        <div
          ref={scrollerRef}
          onScroll={updateArrowState}
          className={cn(
            "no-scrollbar flex justify-center-safe gap-3 overflow-x-auto scroll-smooth pb-1",
            "snap-x snap-mandatory touch-pan-x",
          )}
          tabIndex={0}
        >
          {products.map((product, index) => (
            <div key={product.slug} ref={index === 0 ? firstCardRef : undefined}>
              <CatalogMiniCard product={product} />
            </div>
          ))}
        </div>

        {/* Seta direita */}
        <button
          type="button"
          aria-label="Ver mais produtos"
          onClick={() => scrollByCards("right")}
          disabled={!canScrollRight}
          className={cn(
            "absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-background p-2 shadow-md transition-opacity sm:flex",
            !canScrollRight && "pointer-events-none opacity-0",
          )}
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
      </div>
    </section>
  );
}