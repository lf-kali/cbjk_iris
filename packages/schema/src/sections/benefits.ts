import { z } from "zod";
import { SECTION_ICONS } from "../constants";
import { defineSection, sectionBase } from "../define";

export const benefits = defineSection({
  type: "benefits",
  module: "core",
  label: "Benefícios",
  description: "Lista de vantagens com ícone, título e texto curto.",
  fields: sectionBase.extend({
    items: z
      .array(
        z.strictObject({
          icon: z.enum(SECTION_ICONS).meta({ label: "Ícone", input: "icon" }),
          title: z.string().min(1).meta({ label: "Título" }),
          text: z.string().min(1).meta({ label: "Texto", input: "multiline" }),
        }),
      )
      .min(1)
      .meta({ label: "Benefícios", ask: "always" }),
  }),
  presets: [
    {
      id: "basico",
      label: "3 benefícios de exemplo",
      value: {
        title: "Por que escolher a gente",
        items: [
          { icon: "shield-check", title: "Garantia", text: "Garantia por escrito em todo atendimento." },
          { icon: "clock", title: "Rapidez", text: "Resposta no mesmo dia pelo WhatsApp." },
          { icon: "hand-coins", title: "Preço justo", text: "Orçamento claro antes de começar." },
        ],
      },
    },
  ],
});
