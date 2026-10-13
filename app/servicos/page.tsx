import { services } from "@/data/services";
import { ServiceCard } from "@/components/service-card";

export const metadata = {
  title: "Serviços",
};

export default function ServicosPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Serviços</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {services.length} serviços disponíveis
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
