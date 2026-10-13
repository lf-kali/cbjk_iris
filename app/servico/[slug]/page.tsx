import { notFound } from "next/navigation";
import { serviceCatalog } from "@/lib/catalog/services";
import { siteConfig } from "@/site.config";
import { fillTemplate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { whatsappUrlFor } from "@/lib/whatsapp";
import { CatalogDetail } from "@/components/catalog/CatalogDetail";
import { WhatsappButton } from "@/components/catalog/WhatsappButton";

const texts = siteConfig.texts.services;

export async function generateStaticParams() {
  const services = await serviceCatalog.list();
  return services.map((service) => ({ slug: service.slug }));
}

type ServicoPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = await serviceCatalog.get(slug);
  return { title: service ? service.name : texts.notFound };
}

export default async function ServicoPage({ params }: ServicoPageProps) {
  const { slug } = await params;
  const service = await serviceCatalog.get(slug);
  if (!service) notFound();

  return (
    <CatalogDetail
      item={service}
      crumbs={[{ label: texts.title, href: routes.services }]}
      action={<WhatsappButton href={whatsappUrlFor(service)} label={texts.quote} />}
      notice={fillTemplate(texts.whatsappNotice, { business: siteConfig.name })}
    />
  );
}
