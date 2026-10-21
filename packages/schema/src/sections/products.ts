import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const products = defineSection({
  type: "products",
  module: "products",
  label: "Produtos em destaque",
  description: "Lista de produtos do catálogo, com link para a página de produtos.",
  fields: sectionBase.extend({
    category: z.string().min(1).optional().meta({ label: "Categoria", ask: "optional" }),
    limit: z.number().int().positive().optional().meta({ label: "Quantidade máxima", input: "number" }),
  }),
});
