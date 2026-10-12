"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/types/service";
import { buildServiceQuoteUrl } from "@/lib/whatsapp";

export function QuoteButton({ service }: { service: Service }) {
  return (
    <Button
      size="lg"
      className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <a href={buildServiceQuoteUrl(service)} className="flex gap-3 items-center" target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-5" />
        Peça seu orçamento
      </a>
    </Button>
  );
}
