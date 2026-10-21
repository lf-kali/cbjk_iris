import { z } from "zod";
import { defineSection, sectionBase } from "../define";
import { imageSrc } from "../fields";
import { siteLinkSchema } from "../links";

export const textImage = defineSection({
  type: "text-image",
  module: "core",
  label: "Texto e imagem",
  description: "Texto em parágrafos ao lado de uma imagem.",
  fields: sectionBase.extend({
    /** parágrafos separados por linha em branco */
    text: z.string().min(1).meta({ label: "Texto", input: "multiline", description: "Parágrafos separados por linha em branco" }),
    image: imageSrc.meta({ label: "Imagem", input: "image" }),
    imageAlt: z.string().min(1).meta({ label: "Descrição da imagem" }),
    imageSide: z.enum(["left", "right"]).optional().meta({ label: "Lado da imagem", input: "select" }),
    cta: siteLinkSchema.optional().meta({ label: "Botão", input: "link" }),
  }),
});
