import { describe, expect, it } from "vitest";
import { productSchema, serviceSchema } from "@cbjk_iris/schema";
import { products } from "../src/catalog/data/products";
import { services } from "../src/catalog/data/services";

// Temporário até a E5, quando data/*.ts vira content/*.json validado pelos loaders do engine.
describe("catálogo de exemplo (data/*.ts)", () => {
  it("cada produto valida no productSchema e já sai com os padrões aplicados", () => {
    for (const p of products) {
      const r = productSchema.safeParse(p);
      expect(r.success, `${p.slug}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
      expect(r.data).toEqual(p);
    }
  });

  it("cada serviço valida no serviceSchema", () => {
    for (const s of services) {
      const r = serviceSchema.safeParse(s);
      expect(r.success, `${s.slug}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });
});
