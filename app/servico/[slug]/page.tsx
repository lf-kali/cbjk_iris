import { notFound } from "next/navigation";
import { catalog } from "@/lib/catalog";
import { siteConfig } from "@/site.config";
import { CatalogDetail } from "@/components/catalog/CatalogDetail";

export async function generateStaticParams() {
  const services = await catalog.listServices();
  return services.map((service) => ({ slug: service.slug }));
}

type ServicoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = await catalog.getService(slug);
  return { title: service ? service.name : siteConfig.texts.services.notFound };
}

export default async function ServicoPage({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = await catalog.getService(slug);
  if (!service) notFound();

  return <CatalogDetail item={service} />;
}
