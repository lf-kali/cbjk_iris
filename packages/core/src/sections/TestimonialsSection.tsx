import Image from "next/image";
import { Quote, Star } from "lucide-react";
import type { TestimonialsSection as TestimonialsSectionConfig } from "@cbjk_iris/schema";
import { SectionShell } from "./SectionShell";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function TestimonialsSection({ section }: { section: TestimonialsSectionConfig }) {
  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle} className="bg-muted/40">
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <li key={item.name} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
            <Quote className="size-6 text-primary/40" aria-hidden />
            {item.rating && (
              <div className="flex gap-0.5" aria-label={`${item.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} aria-hidden className={i < item.rating! ? "size-4 fill-highlight text-highlight" : "size-4 text-muted-foreground/40"} />
                ))}
              </div>
            )}
            <p className="flex-1 text-sm leading-relaxed text-card-foreground">{item.text}</p>
            <div className="flex items-center gap-3">
              {item.image ? (
                <Image src={item.image} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(item.name)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
