import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const services = defineSection({
  type: "services",
  module: "services",
  label: "Serviços em destaque",
  description: "Lista de serviços do catálogo, com link para a página de serviços.",
  fields: sectionBase.extend({
    limit: z.number().int().positive().optional().meta({ label: "Quantidade máxima", input: "number" }),
  }),
});
