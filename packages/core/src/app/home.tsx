import { siteConfig } from "../lib/config";
import { RenderSections } from "../sections/RenderSections";

export default function Home() {
  return (
    <main className="flex flex-col">
      <h1 className="sr-only">{siteConfig.seo.title}</h1>
      <RenderSections sections={siteConfig.home.sections} />
    </main>
  );
}
