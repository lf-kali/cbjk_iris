import Image from "next/image";
import type { TextImageSection as TextImageSectionConfig } from "@/types/sections";
import { cn } from "@/lib/utils";
import { SectionShell } from "./SectionShell";
import { LinkButton } from "./LinkButton";

export function TextImageSection({ section }: { section: TextImageSectionConfig }) {
  const paragraphs = section.text.split(/\n\s*\n/);

  return (
    <SectionShell id={section.id}>
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className={cn("relative aspect-[4/3] overflow-hidden rounded-lg bg-muted", section.imageSide === "right" && "md:order-last")}>
          <Image src={section.image} alt={section.imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          {section.title && <h2 className="text-2xl font-bold text-foreground md:text-3xl">{section.title}</h2>}
          {section.subtitle && <p className="font-medium text-primary">{section.subtitle}</p>}
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-muted-foreground">{p}</p>
          ))}
          {section.cta && <LinkButton link={section.cta} className="mt-2 w-fit" />}
        </div>
      </div>
    </SectionShell>
  );
}
