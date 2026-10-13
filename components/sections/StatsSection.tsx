import type { StatsSection as StatsSectionConfig } from "@/types/sections";
import { SectionShell } from "./SectionShell";

export function StatsSection({ section }: { section: StatsSectionConfig }) {
  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle}>
      <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
        {section.items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse gap-1">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-4xl font-bold text-primary md:text-5xl">{item.value}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
