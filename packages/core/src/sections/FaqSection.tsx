import type { FaqSection as FaqSectionConfig } from "@cbjk_iris/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { SectionShell } from "./SectionShell";

export function FaqSection({ section }: { section: FaqSectionConfig }) {
  // dados estruturados para o Google mostrar as perguntas nos resultados
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <SectionShell id={section.id} title={section.title} subtitle={section.subtitle} innerClassName="max-w-3xl">
      <Accordion className="rounded-lg border border-border bg-card px-5">
        {section.items.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
            <AccordionContent>
              <p className="pb-4 text-muted-foreground">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </SectionShell>
  );
}
