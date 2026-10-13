import type { HeroSection as HeroSectionConfig } from "@/types/sections";
import { FadeCarousel } from "@/components/FadeCarousel";
import { LinkButton } from "./LinkButton";

const BUTTONS_ALIGN = { left: "", center: "justify-center", right: "justify-end" };

const HEIGHT = {
  sm: "h-[45vh] min-h-80",
  md: "h-[60vh] min-h-96",
  lg: "h-[75vh] min-h-[28rem]",
  full: "h-[calc(100svh-5rem)] lg:h-[calc(100svh-6.25rem)]",
};

// Carrossel de destaque: cada slide tem foto, texto e até dois botões, ou é clicável por inteiro.
export function HeroSection({ section }: { section: HeroSectionConfig }) {
  return (
    <section id={section.id} className="w-full">
      <FadeCarousel
        autoplay={section.autoplay ?? true}
        autoplayInterval={section.interval}
        className={HEIGHT[section.height ?? "lg"]}
        slides={section.slides.map((slide, i) => ({
          id: i,
          image: slide.image,
          alt: slide.alt || slide.title,
          href: slide.href,
          align: slide.align,
          content: (
            <div className="max-w-2xl text-white">
              <h2 className="text-3xl font-bold md:text-5xl">{slide.title}</h2>
              {slide.subtitle && <p className="mt-3 text-base md:text-lg">{slide.subtitle}</p>}
              {(slide.cta || slide.secondaryCta) && (
                <div className={`mt-6 flex flex-wrap gap-3 ${BUTTONS_ALIGN[slide.align ?? "left"]}`}>
                  {slide.cta && <LinkButton link={slide.cta} variant="cta" />}
                  {slide.secondaryCta && (
                    <LinkButton
                      link={slide.secondaryCta}
                      variant="outline"
                      className="border-white/70 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                    />
                  )}
                </div>
              )}
            </div>
          ),
        }))}
      />
    </section>
  );
}
