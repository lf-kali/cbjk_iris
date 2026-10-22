import { notFound } from "next/navigation";
import { loadPage, loadPages } from "@cbjk_iris/engine/content";
import { siteConfig } from "../lib/config";
import { RenderSections } from "../sections/RenderSections";

// Páginas montadas com seções a partir de content/pages/<slug>.json (ex.: /sobre, /contato),
// lidas e validadas pelos loaders do engine (SPEC §5.3).
// Rotas fixas (/produtos, /servicos...) têm prioridade sobre esta.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await loadPages({ modules: siteConfig.modules })).map((page) => ({ slug: page.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

function findPage(slug: string) {
  return loadPage(slug, { modules: siteConfig.modules });
}

export async function generateMetadata({ params }: PageProps) {
  const page = await findPage((await params).slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function ConfigPage({ params }: PageProps) {
  const page = await findPage((await params).slug);
  if (!page) notFound();

  return (
    <main className="flex flex-col">
      <h1 className="sr-only">{page.title}</h1>
      <RenderSections sections={page.sections} />
    </main>
  );
}
