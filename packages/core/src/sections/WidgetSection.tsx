import type { WidgetSection as WidgetSectionConfig } from "@cbjk_iris/schema";
import { SectionShell } from "./SectionShell";
import { WidgetEmbed } from "./WidgetEmbed";

// Código oficial de widgets de terceiros (avaliações, selos). O conteúdo vem do
// site.config.ts, escrito por quem mantém o site; não use com HTML de visitantes.
export function WidgetSection({ section }: { section: WidgetSectionConfig }) {
  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle}>
      <WidgetEmbed html={section.html} minHeight={section.minHeight} />
    </SectionShell>
  );
}
