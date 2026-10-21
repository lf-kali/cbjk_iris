import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const gallery = defineSection({
  type: "gallery",
  module: "gallery",
  label: "Galeria de projetos",
  description: "Fotos de public/ultimos_projetos, com link para a galeria completa.",
  fields: sectionBase.extend({
    limit: z.number().int().positive().optional().meta({ label: "Quantidade máxima de fotos", input: "number" }),
  }),
});
