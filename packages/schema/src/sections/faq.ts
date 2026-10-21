import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const faq = defineSection({
  type: "faq",
  module: "core",
  label: "Perguntas frequentes",
  description: "Perguntas e respostas, com dados estruturados para o Google.",
  fields: sectionBase.extend({
    items: z
      .array(
        z.strictObject({
          question: z.string().min(1).meta({ label: "Pergunta" }),
          answer: z.string().min(1).meta({ label: "Resposta", input: "multiline" }),
        }),
      )
      .min(1)
      .meta({ label: "Perguntas", ask: "always" }),
  }),
  presets: [
    {
      id: "basico",
      label: "3 perguntas de exemplo",
      value: {
        title: "Dúvidas frequentes",
        items: [
          { question: "Como faço um orçamento?", answer: "Fale com a gente pelo WhatsApp e responda algumas perguntas rápidas." },
          { question: "Quais as formas de pagamento?", answer: "Pix, débito e crédito." },
          { question: "Vocês dão garantia?", answer: "Sim, com termo por escrito." },
        ],
      },
    },
  ],
  limits: { maxPerPage: 1 },
});
