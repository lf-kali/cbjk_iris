import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const stats = defineSection({
  type: "stats",
  module: "core",
  label: "Números",
  description: "Números de destaque (anos de experiência, clientes atendidos...).",
  fields: sectionBase.extend({
    items: z
      .array(
        z.strictObject({
          value: z.string().min(1).meta({ label: "Número", example: "10+" }),
          label: z.string().min(1).meta({ label: "Legenda", example: "anos de experiência" }),
        }),
      )
      .min(1)
      .meta({ label: "Números", ask: "always" }),
  }),
  presets: [
    {
      id: "basico",
      label: "3 números de exemplo",
      value: {
        items: [
          { value: "10+", label: "anos de experiência" },
          { value: "1.000+", label: "clientes atendidos" },
          { value: "4,9", label: "nota média" },
        ],
      },
    },
  ],
});
