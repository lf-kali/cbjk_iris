"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/types/service";
import { buildServiceQuoteUrl } from "@/lib/whatsapp";

export function QuoteButton({ service }: { service: Service }) {
  return (
    <Button
      size="lg"
      variant="cta"
      className="w-full gap-2"
    >
      <a href={buildServiceQuoteUrl(service)} className="flex gap-3 items-center" target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-5" />
        Peça seu orçamento
      </a>
    </Button>
  );
}
