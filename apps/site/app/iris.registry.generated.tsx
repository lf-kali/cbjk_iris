// Gerado por iris sync. Não edite à mão.
// Até a CLI existir, quem gera é "npm run modules:sync" (apps/site/scripts/sync-modules.mjs), a partir de modules.json.
import type { SectionRegistry } from "@cbjk_iris/schema";
import HeroSection from "@cbjk_iris/core/sections/hero";
import BenefitsSection from "@cbjk_iris/core/sections/benefits";
import TextImageSection from "@cbjk_iris/core/sections/text-image";
import CtaBannerSection from "@cbjk_iris/core/sections/cta-banner";
import TestimonialsSection from "@cbjk_iris/core/sections/testimonials";
import StatsSection from "@cbjk_iris/core/sections/stats";
import FaqSection from "@cbjk_iris/core/sections/faq";
import ContactSection from "@cbjk_iris/core/sections/contact";
import LeadFormSection from "@cbjk_iris/core/sections/lead-form";
import WidgetSection from "@cbjk_iris/core/sections/widget";
import ProductsSection from "@cbjk_iris/core/sections/products";
import ServicesSection from "@cbjk_iris/core/sections/services";
import GallerySection from "@cbjk_iris/core/sections/gallery";

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
