import { z } from "zod";
import { defineSection, sectionBase } from "../define";

export const contact = defineSection({
  type: "contact",
  module: "core",
  label: "Contato",
  description: "Telefone, e-mail, endereço, horário e mapa, a partir de siteConfig.contact.",
  fields: sectionBase.extend({
    /** mostra o mapa de siteConfig.contact.mapEmbedUrl */
    showMap: z.boolean().optional().meta({ label: "Mostrar o mapa", input: "confirm" }),
  }),
});
