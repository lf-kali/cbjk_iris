import { FadeCarousel } from '../components/FadeCarousel';
import { siteConfig } from "@/site.config";
import { homeSections } from "@/components/home/sections";

export default async function Home() {
  return (
    <div className="flex flex-col overflow-x-hidden flex-1 items-center justify-center font-bold">
      <h1 className="sr-only">{siteConfig.seo.title}</h1>
      <FadeCarousel
        slides={siteConfig.home.slides.map((slide, i) => ({
          id: i,
          image: slide.image,
          alt: slide.alt,
          content: (
            <div className="text-white">
              <h2 className="text-3xl font-bold">{slide.title}</h2>
              {slide.subtitle && <p className="mt-2">{slide.subtitle}</p>}
            </div>
          ),
        }))}
      />

      {siteConfig.home.sections.map((section, i) => {
        const Section = homeSections[section.type];
        if (!Section) {
          throw new Error(
            `Seção "${section.type}" está em siteConfig.home.sections, mas nenhum módulo ativo a fornece. ` +
              `Remova-a do config ou rode "npm run modules:sync".`,
          );
        }
        return <Section key={i} section={section} />;
      })}
    </div>
  );
}
