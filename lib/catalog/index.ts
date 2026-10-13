import { mockCatalog } from "./mock";
import type { CatalogRepository } from "./repository";

// Fonte de dados ativa. Para usar uma API ou banco, troque pela sua implementação.
export const catalog: CatalogRepository = mockCatalog;

export type { CatalogRepository };
