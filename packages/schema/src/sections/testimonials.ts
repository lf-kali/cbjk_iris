import { z } from "zod";
import { defineSection, sectionBase } from "../define";
import { imageSrc } from "../fields";

export const testimonials = defineSection({
  type: "testimonials",
  module: "core",
  label: "Depoimentos",
  description: "Opiniões de clientes, com nota de 1 a 5.",
  fields: sectionBase.extend({
    items: z
      .array(
        z.strictObject({
          name: z.string().min(1).meta({ label: "Nome" }),
          text: z.string().min(1).meta({ label: "Depoimento", input: "multiline" }),
          role: z.string().min(1).optional().meta({ label: "Descrição", example: "Troca de tela", ask: "optional" }),
          rating: z.literal([1, 2, 3, 4, 5]).optional().meta({ label: "Nota", input: "select" }),
          image: imageSrc.optional().meta({ label: "Foto", input: "image" }),
        }),
      )
      .min(1)
      .meta({ label: "Depoimentos", ask: "always" }),
  }),
  presets: [
    {
      id: "basico",
      label: "2 depoimentos de exemplo",
      value: {
        title: "O que dizem nossos clientes",
        items: [
          { name: "Cliente 1", rating: 5, text: "Atendimento rápido e atencioso. Recomendo." },
          { name: "Cliente 2", rating: 5, text: "Resolveram no mesmo dia, com garantia." },
        ],
      },
    },
  ],
});
