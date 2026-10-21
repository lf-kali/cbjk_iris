import type { ReactNode } from "react";
import { cn } from "../lib/utils";

// Moldura comum das seções: espaçamento vertical, largura máxima, título e subtítulo.
export function SectionShell({
  id,
  title,
  subtitle,
  action,
  className,
  innerClassName,
  children,
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  /** link ou botão à direita do título (ex.: "Ver todos") */
  action?: ReactNode;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("w-full scroll-mt-28 py-12 md:py-16", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4", innerClassName)}>
        {(title || subtitle || action) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              {title && <h2 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h2>}
              {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
