// Seções da home e das páginas (SPEC §5.5): um arquivo por seção, reunidos aqui.
// Cada tipo é renderizado pelo componente @cbjk_iris/core/sections/<type>, no registro gerado.
import { z } from "zod";
import type { SectionModule } from "../define";
import { benefits } from "./benefits";
import { contact } from "./contact";
import { ctaBanner } from "./cta-banner";
import { faq } from "./faq";
import { gallery } from "./gallery";
import { hero } from "./hero";
import { leadForm } from "./lead-form";
import { products } from "./products";
import { services } from "./services";
import { stats } from "./stats";
import { testimonials } from "./testimonials";
import { textImage } from "./text-image";
import { widget } from "./widget";

/** Todas as definições, na ordem de hoje: as do núcleo e depois as dos módulos. */
export const sectionDefinitions = [
  hero, benefits, textImage, ctaBanner, testimonials, stats, faq, contact, leadForm, widget,
  products, services, gallery,
] as const;

export const sectionSchema = z.discriminatedUnion("type", [
  hero.schema, benefits.schema, textImage.schema, ctaBanner.schema, testimonials.schema, stats.schema,
  faq.schema, contact.schema, leadForm.schema, widget.schema, products.schema, services.schema, gallery.schema,
]);

export type Section = z.output<typeof sectionSchema>;
export type SectionInput = z.input<typeof sectionSchema>;
export type SectionType = Section["type"];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
export type SectionDefinitionOf<T extends SectionType> = Extract<(typeof sectionDefinitions)[number], { type: T }>;

export const SECTION_TYPES: readonly SectionType[] = sectionDefinitions.map((d) => d.type);

export function getSectionDefinition<T extends SectionType>(type: T): SectionDefinitionOf<T> {
  const def = sectionDefinitions.find((d) => d.type === type);
  if (!def) throw new Error(`Seção desconhecida: "${type}". Tipos válidos: ${SECTION_TYPES.join(", ")}`);
  return def as SectionDefinitionOf<T>;
}

/** Tipos de seção de um módulo ("core" = sempre presentes). */
export function sectionsOfModule(module: SectionModule): SectionType[] {
  return sectionDefinitions.filter((d) => d.module === module).map((d) => d.type);
}

// Nomes de tipo usados pelo core desde antes da migração
export type HeroSection = SectionOf<"hero">;
export type HeroSlide = HeroSection["slides"][number];
export type BenefitsSection = SectionOf<"benefits">;
export type TextImageSection = SectionOf<"text-image">;
export type CtaBannerSection = SectionOf<"cta-banner">;
export type TestimonialsSection = SectionOf<"testimonials">;
export type StatsSection = SectionOf<"stats">;
export type FaqSection = SectionOf<"faq">;
export type ContactSection = SectionOf<"contact">;
export type LeadFormSection = SectionOf<"lead-form">;
export type WidgetSection = SectionOf<"widget">;
export type ProductsSection = SectionOf<"products">;
export type ServicesSection = SectionOf<"services">;
export type GallerySection = SectionOf<"gallery">;
