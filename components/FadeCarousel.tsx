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
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"; // helper padrão do shadcn (clsx + tailwind-merge)

export type CarouselSlide = {
  id: string | number;
  image: string;
  alt: string;
  content?: ReactNode;
  /** slide inteiro clicável */
  href?: string;
  /** posição do conteúdo */
  align?: "left" | "center" | "right";
};

const ALIGN = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
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
  // marca um arraste recém-terminado, para o clique que vem em seguida não abrir links
  const draggedRef = useRef(false);
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

  const SWIPE_THRESHOLD = 50; // px mínimos de arraste pra contar como swipe
  const draggingRef = useRef(false);

  // Fim de um arraste (mouse ou toque): decide o slide e marca o arraste para
  // o clique seguinte não abrir links.
  const finishDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const delta = dragDeltaX.current;
    if (delta > SWIPE_THRESHOLD) prev();
    else if (delta < -SWIPE_THRESHOLD) next();
    if (Math.abs(delta) > 8) draggedRef.current = true;
    dragDeltaX.current = 0;
    setIsDragging(false);
  }, [next, prev]);

  const finishDragRef = useRef(finishDrag);
  useEffect(() => {
    finishDragRef.current = finishDrag;
  }, [finishDrag]);

  // Toque: Touch Events nativos, o caminho mais confiável nos navegadores móveis
  // (o Safari do iOS tem particularidades com captura de pointer). O eixo trava
  // nos primeiros pixels: horizontal troca de slide e bloqueia a rolagem;
  // vertical deixa a página rolar normalmente.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || slides.length <= 1) return;

    let startX = 0;
    let startY = 0;
    let axis: "x" | "y" | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as HTMLElement).closest("button")) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      axis = null;
      dragDeltaX.current = 0;
      draggedRef.current = false;
      draggingRef.current = true;
      setIsDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis === "y") {
        // gesto vertical: é rolagem da página, não swipe
        draggingRef.current = false;
        dragDeltaX.current = 0;
        setIsDragging(false);
        return;
      }
      if (axis === "x") {
        e.preventDefault();
        dragDeltaX.current = dx;
      }
    };

    const onTouchEnd = () => finishDragRef.current();

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [slides.length]);

  // Mouse e caneta: Pointer Events (o toque fica com os Touch Events acima).
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    // Se o clique começou em um botão (setas ou dots), não inicia o drag nem
    // captura o pointer — senão o container "rouba" o pointerup e o click do botão não dispara.
    if ((e.target as HTMLElement).closest("button")) return;

    draggingRef.current = true;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    draggedRef.current = false;
    // em links não captura o pointer: com captura, o clique cairia no container e o link não abriria
    if (!(e.target as HTMLElement).closest("a")) containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || !draggingRef.current) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    finishDrag();
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
      onPointerCancel={handlePointerUp}
      // o arraste nativo de links/imagens cancela os eventos de pointer e travaria o swipe
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (draggedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          draggedRef.current = false;
        }
      }}
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

            {slide.href && (
              <Link
                href={slide.href}
                aria-label={slide.alt}
                tabIndex={isActive ? 0 : -1}
                className="absolute inset-0 z-[1]"
                draggable={false}
              />
            )}

            {slide.content && (
              <div
                // a key muda quando o slide fica ativo, forçando o React a
                // remontar o bloco e disparar a animação de entrada de novo
                key={`${slide.id}-${isActive}`}
                className={cn(
                  // o conteúdo não bloqueia o link do slide; só os botões dentro dele recebem clique
                  "pointer-events-none absolute inset-0 z-[2] flex flex-col justify-end p-8 pb-14 md:p-16 [&_a]:pointer-events-auto",
                  ALIGN[slide.align ?? "left"],
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
          {/* no celular, setas escondidas: o arraste troca de slide e o texto fica livre */}
          <button
            type="button"
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full sm:block bg-background/80 p-2 backdrop-blur transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próximo slide"
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full sm:block bg-background/80 p-2 backdrop-blur transition hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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