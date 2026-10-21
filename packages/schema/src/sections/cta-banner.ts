import { z } from "zod";
import { defineSection, sectionBase } from "../define";
import { siteLinkSchema } from "../links";

export const ctaBanner = defineSection({
  type: "cta-banner",
  module: "core",
  label: "Chamada para ação",
  description: "Faixa de destaque com texto curto e um botão.",
  fields: sectionBase.extend({
    text: z.string().min(1).optional().meta({ label: "Texto", input: "multiline", ask: "optional" }),
    cta: siteLinkSchema.meta({ label: "Botão", input: "link" }),
    /** cor de fundo: primária, cor de ação ou discreta */
    tone: z.enum(["primary", "cta", "muted"]).optional().meta({ label: "Cor de fundo", input: "select" }),
  }),
});
