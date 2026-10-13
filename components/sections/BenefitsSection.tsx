import type { BenefitsSection as BenefitsSectionConfig } from "@/types/sections";
import { SectionShell } from "./SectionShell";
import { SECTION_ICON_COMPONENTS } from "./icons";

export function BenefitsSection({ section }: { section: BenefitsSectionConfig }) {
  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle}>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item) => {
          const Icon = SECTION_ICON_COMPONENTS[item.icon];
          return (
            <li key={item.title} className="flex flex-col gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
