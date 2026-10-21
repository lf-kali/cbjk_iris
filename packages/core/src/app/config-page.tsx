import { notFound } from "next/navigation";
import { siteConfig } from "../lib/config";
import { RenderSections } from "../sections/RenderSections";

// Páginas montadas com seções a partir de siteConfig.pages (ex.: /sobre, /contato).
// Rotas fixas (/produtos, /servicos...) têm prioridade sobre esta.
export const dynamicParams = false;

export function generateStaticParams() {
  return (siteConfig.pages ?? []).map((page) => ({ slug: page.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

function findPage(slug: string) {
  return siteConfig.pages?.find((page) => page.slug === slug);
}

export async function generateMetadata({ params }: PageProps) {
  const page = findPage((await params).slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function ConfigPage({ params }: PageProps) {
  const page = findPage((await params).slug);
  if (!page) notFound();

  return (
    <main className="flex flex-col">
      <h1 className="sr-only">{page.title}</h1>
      <RenderSections sections={page.sections} />
    </main>
  );
}
