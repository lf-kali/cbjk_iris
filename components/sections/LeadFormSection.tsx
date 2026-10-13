import type { LeadFormSection as LeadFormSectionConfig } from "@/types/sections";
import { siteConfig } from "@/site.config";
import { SectionShell } from "./SectionShell";
import { LeadForm } from "./LeadForm";

export function LeadFormSection({ section }: { section: LeadFormSectionConfig }) {
  const config = siteConfig.leads ?? { provider: "whatsapp" };
  if (config.provider === "backend") {
    // falha no build, e não no clique do visitante
    throw new Error('siteConfig.leads.provider "backend" ainda não está implementado; use "whatsapp" ou "endpoint".');
  }

  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle} innerClassName="max-w-2xl">
      <LeadForm
        config={config}
        fields={section.fields ?? ["name", "phone", "message"]}
        texts={siteConfig.texts.leadForm}
        submitLabel={section.submitLabel}
        consentText={section.consentText}
      />
    </SectionShell>
  );
}
