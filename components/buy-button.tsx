"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export function BuyButton({ product }: { product: Product }) {
  return (
    <Button
      size="lg"
      variant="cta"
      className="w-full gap-2"
    >
      <a className="flex flex-row items-center gap-3 text-md" href={buildWhatsappUrl(product)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-5" />
        Comprar pelo WhatsApp
      </a>
    </Button>
  );
}
