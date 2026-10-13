import { FadeCarousel } from '../components/FadeCarousel';
import { ProductScrollList } from "@/components/product/ProductScrollList"
import { siteConfig } from "@/site.config";

export default function Home() {
  return (
    <div className="flex flex-col overflow-x-hidden flex-1 items-center justify-center font-bold">
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

      <ProductScrollList className="p-4.5"/>
    </div>
  );
}
