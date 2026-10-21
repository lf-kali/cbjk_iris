"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, KeyboardEvent } from "react";

import { FadeCarousel, type CarouselSlide } from "../carousel/FadeCarousel";
import type { Service } from "@cbjk_iris/schema";
import { siteConfig } from "../lib/config";
import { itemHref } from "../lib/routes";

export function ServiceCard({ service }: { service: Service }) {
  const router = useRouter();

  const slides: CarouselSlide[] = service.images.map((image, i) => ({
    id: i,
    image,
    alt: `${service.name} — foto ${i + 1}`,
  }));

  function goToService() {
    router.push(itemHref(service));
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    // clique dentro do carrossel (setas, dots, drag) não deve navegar —
    // só a área do texto/card em volta dele
    if ((event.target as HTMLElement).closest("[data-carousel]")) return;
    goToService();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToService();
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Ver detalhes do serviço ${service.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md md:flex-row"
    >
      <div
        data-carousel
        className="relative h-56 w-full shrink-0 sm:h-72 md:h-auto md:w-2/5 lg:w-1/3"
      >
        <FadeCarousel slides={slides} autoplay={false} className="h-full" />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 p-5 md:p-8">
        <h3 className="text-lg font-semibold text-foreground md:text-xl">
          {service.name}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground md:text-base">
          {service.shortDescription}
        </p>
        <span className="mt-2 text-sm font-medium text-cta group-hover:underline">
          {siteConfig.texts.services.cardLink}
        </span>
      </div>
    </div>
  );
}
