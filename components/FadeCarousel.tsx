"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"; // helper padrão do shadcn (clsx + tailwind-merge)

export type CarouselSlide = {
  id: string | number;
  image: string;
  alt: string;
  content?: ReactNode;
};

type FadeCarouselProps = {
  slides: CarouselSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  className?: string;
};

export function FadeCarousel({
  slides,
  autoplay = true,
  autoplayInterval = 6000,
  className,
}: FadeCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);
  const wheelResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (i: number) => setIndex((i + slides.length) % slides.length),
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Autoplay — pausa enquanto o usuário está arrastando
  useEffect(() => {
    if (!autoplay || isDragging || slides.length <= 1) return;
    const id = setInterval(next, autoplayInterval);
    return () => clearInterval(id);
  }, [autoplay, autoplayInterval, isDragging, next, slides.length]);

  // Scroll horizontal do touchpad troca de slide. Precisa ser um listener
  // nativo com passive: false — o React trata onWheel/onTouch como passivo
  // por padrão (por performance), então preventDefault() no JSX não teria
  // efeito e a página rolaria na horizontal junto com o carrossel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || slides.length <= 1) return;

    const handleWheel = (e: WheelEvent) => {
      // ignora gestos predominantemente verticais, pra não capturar o
      // scroll normal da página
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      e.preventDefault();
      if (wheelLockRef.current) return;

      const threshold = 30;
      if (e.deltaX > threshold) next();
      else if (e.deltaX < -threshold) prev();
      else return;

      // trava novos disparos até o gesto atual "esfriar" — um único
      // movimento no touchpad gera dezenas de eventos wheel
      wheelLockRef.current = true;
      if (wheelResetTimeout.current) clearTimeout(wheelResetTimeout.current);
      wheelResetTimeout.current = setTimeout(() => {
        wheelLockRef.current = false;
      }, 600);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [next, prev, slides.length]);

  useEffect(() => {
    return () => {
      if (wheelResetTimeout.current) clearTimeout(wheelResetTimeout.current);
    };
  }, []);

  // Pointer Events cobrem mouse, touch e caneta com a mesma lógica —
  // não precisa de handlers separados para touch e clique de arraste.
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Se o toque/clique começou em um botão (setas ou dots), não inicia o
    // drag nem captura o pointer — do contrário o container "rouba" o
    // pointerup do botão e o evento click nunca chega a disparar.
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    const threshold = 50; // px mínimos de arraste pra contar como swipe
    if (dragDeltaX.current > threshold) prev();
    else if (dragDeltaX.current < -threshold) next();
    setIsDragging(false);
    dragDeltaX.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[70vh] overflow-hidden select-none touch-pan-y",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {slides.map((slide, i) => {
        const isActive = i === index;
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            )}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />

            {/* leve overlay pra garantir legibilidade do texto */}
            <div className="absolute inset-0 bg-black/30" />

            {slide.content && (
              <div
                // a key muda quando o slide fica ativo, forçando o React a
                // remontar o bloco e disparar a animação de entrada de novo
                key={`${slide.id}-${isActive}`}
                className={cn(
                  "absolute inset-0 flex flex-col items-start justify-end p-8 md:p-16",
                  isActive &&
                    "fill-mode-both animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-700 ease-out motion-reduce:animate-none"
                )}
              >
                {slide.content}
              </div>
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próximo slide"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}