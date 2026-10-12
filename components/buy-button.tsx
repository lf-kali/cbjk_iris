"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export function BuyButton({ product }: { product: Product }) {
  return (
    <Button
      size="lg"
      className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <a className="flex flex-row items-center gap-3 text-md" href={buildWhatsappUrl(product)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-5" />
        Comprar pelo WhatsApp
      </a>
    </Button>
  );
}
