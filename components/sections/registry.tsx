// Gerado por scripts/sync-modules.mjs a partir de modules.json. Não edite à mão:
// rode "npm run modules:sync" depois de adicionar ou remover um módulo.
import type { SectionRegistry } from "@/types/section-registry";
import { HeroSection } from "@/components/sections/HeroSection";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { TextImageSection } from "@/components/sections/TextImageSection";
import { CtaBannerSection } from "@/components/sections/CtaBannerSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { StatsSection } from "@/components/sections/StatsSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { LeadFormSection } from "@/components/sections/LeadFormSection";
import { WidgetSection } from "@/components/sections/WidgetSection";
import { ProductsSection } from "@/components/products/ProductsSection";
import { ServicesSection } from "@/components/services/ServicesSection";
import { GallerySection } from "@/components/gallery/GallerySection";

export const sectionRegistry: SectionRegistry = {
  "hero": HeroSection,
  "benefits": BenefitsSection,
  "text-image": TextImageSection,
  "cta-banner": CtaBannerSection,
  "testimonials": TestimonialsSection,
  "stats": StatsSection,
  "faq": FaqSection,
  "contact": ContactSection,
  "lead-form": LeadFormSection,
  "widget": WidgetSection,
  "products": ProductsSection,
  "services": ServicesSection,
  "gallery": GallerySection,
};
