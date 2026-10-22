import { loadHome } from "@cbjk_iris/engine/content";
import { siteConfig } from "../lib/config";
import { RenderSections } from "../sections/RenderSections";

// Seções da home: content/home.json, lido e validado pelo loader do engine (SPEC §5.3).
export default async function Home() {
  const home = await loadHome({ modules: siteConfig.modules });

  return (
    <main className="flex flex-col">
      <h1 className="sr-only">{siteConfig.seo.title}</h1>
      <RenderSections sections={home.sections} />
    </main>
  );
}
