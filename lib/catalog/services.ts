import { services } from "@/data/services";
import type { Service } from "@/types/catalog";

// Contrato da fonte de serviços. Para usar uma API ou banco, implemente-a e troque `serviceCatalog`.
export interface ServiceRepository {
  list(): Promise<Service[]>;
  get(slug: string): Promise<Service | undefined>;
}

const mockServices: ServiceRepository = {
  async list() {
    return services;
  },

  async get(slug) {
    return services.find((service) => service.slug === slug);
  },
};

export const serviceCatalog: ServiceRepository = mockServices;
