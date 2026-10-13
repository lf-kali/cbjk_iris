import type { CtaBannerSection as CtaBannerSectionConfig } from "@/types/sections";
import { cn } from "@/lib/utils";
import { LinkButton } from "./LinkButton";

const TONES = {
  primary: { box: "bg-primary text-primary-foreground", text: "text-primary-foreground/80", button: "secondary" as const },
  cta: { box: "bg-cta text-cta-foreground", text: "text-cta-foreground/80", button: "secondary" as const },
  muted: { box: "bg-muted text-foreground", text: "text-muted-foreground", button: "cta" as const },
};

export function CtaBannerSection({ section }: { section: CtaBannerSectionConfig }) {
  const tone = TONES[section.tone ?? "primary"];

  return (
    <section id={section.id} className="w-full scroll-mt-28 px-4 py-12 md:py-16">
      <div className={cn("mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-xl p-8 md:flex-row md:items-center md:justify-between md:p-12", tone.box)}>
        <div className="max-w-2xl">
          {section.title && <h2 className="text-2xl font-bold md:text-3xl">{section.title}</h2>}
          {section.text && <p className={cn("mt-2", tone.text)}>{section.text}</p>}
        </div>
        <LinkButton link={section.cta} variant={tone.button} className="shrink-0" />
      </div>
    </section>
  );
}
