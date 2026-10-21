import Image from "next/image";
import Link from "next/link";
import type { ServicesSection as ServicesSectionConfig } from "@cbjk_iris/schema";
import { siteConfig } from "../lib/config";
import { serviceCatalog } from "../catalog/services";
import { itemHref, routes } from "../lib/routes";
import { SectionShell } from "../sections/SectionShell";

// Seção "services": grade compacta de serviços com link para cada um.
export async function ServicesSection({ section }: { section: ServicesSectionConfig }) {
  const services = (await serviceCatalog.list()).slice(0, section.limit ?? 4);
  if (services.length === 0) return null;

  return (
    <SectionShell
      id={section.id}
      title={section.title}
      subtitle={section.subtitle}
      action={<Link href={routes.services} className="text-sm font-medium text-primary hover:underline">{siteConfig.texts.sections.seeAll} →</Link>}
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <li key={service.slug}>
            <Link href={itemHref(service)} className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={service.images[0]} alt={service.name} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-col gap-1 p-4">
                <h3 className="font-semibold text-card-foreground">{service.name}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{service.shortDescription}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
