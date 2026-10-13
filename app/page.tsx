import { siteConfig } from "@/site.config";
import { RenderSections } from "@/components/sections/RenderSections";

export default function Home() {
  return (
    <main className="flex flex-col">
      <h1 className="sr-only">{siteConfig.seo.title}</h1>
      <RenderSections sections={siteConfig.home.sections} />
    </main>
  );
}
