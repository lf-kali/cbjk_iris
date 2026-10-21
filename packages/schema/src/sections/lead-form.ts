import { z } from "zod";
import { LEAD_FIELDS } from "../constants";
import { defineSection, sectionBase } from "../define";
import { uniqueItems } from "../fields";

/** Formulário de contato. O destino dos dados vem de siteConfig.leads. */
export const leadForm = defineSection({
  type: "lead-form",
  module: "core",
  label: "Formulário de contato",
  description: "Formulário de orçamento; os dados vão para o WhatsApp ou para um serviço de formulários.",
  fields: sectionBase.extend({
    /** campos, na ordem; em branco = nome, telefone e mensagem */
    fields: z
      .array(z.enum(LEAD_FIELDS))
      .superRefine(uniqueItems("campo"))
      .optional()
      .meta({ label: "Campos", input: "multiselect" }),
    submitLabel: z.string().min(1).optional().meta({ label: "Texto do botão de envio" }),
    /** texto de consentimento (LGPD) exibido com uma caixa de seleção obrigatória */
    consentText: z.string().min(1).optional().meta({ label: "Texto de consentimento (LGPD)", input: "multiline" }),
  }),
});
