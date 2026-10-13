import { catalog } from "@/lib/catalog";
import { siteConfig } from "@/site.config";
import { fillTemplate } from "@/lib/format";
import { ServiceCard } from "@/components/catalog/ServiceCard";

const texts = siteConfig.texts.services;

export const metadata = {
  title: texts.title,
};

export default async function ServicosPage() {
  const services = await catalog.listServices();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{texts.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fillTemplate(texts.count, { count: services.length })}
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </main>
  );
}
