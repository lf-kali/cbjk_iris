import { loadServices } from "@cbjk_iris/engine/content";
import type { Service } from "@cbjk_iris/schema";

// Contrato da fonte de serviços. Para usar uma API ou banco, implemente-a e troque `serviceCatalog`.
// A implementação padrão lê content/services/<slug>.json pelo loader do engine (SPEC §5.3): só servidor.
export interface ServiceRepository {
  list(): Promise<Service[]>;
  get(slug: string): Promise<Service | undefined>;
}

const contentServices: ServiceRepository = {
  async list() {
    return loadServices();
  },

  async get(slug) {
    return (await loadServices()).find((service) => service.slug === slug);
  },
};

export const serviceCatalog: ServiceRepository = contentServices;
