import { z } from "zod";
import { defineSection, sectionBase } from "../define";
import { cssLength } from "../fields";

/**
 * Código de widget colado (avaliações do TripAdvisor, Reclame Aqui, Trustpilot, Elfsight...).
 * Os <script> do código rodam no navegador: é conteúdo de confiança do dono do site.
 */
export const widget = defineSection({
  type: "widget",
  module: "core",
  label: "Widget externo",
  description: "Código de widget colado de outra plataforma (avaliações, agenda...). Os scripts rodam no navegador.",
  fields: sectionBase.extend({
    html: z.string().min(1).meta({ label: "Código do widget", input: "multiline" }),
    /** altura mínima reservada enquanto o widget carrega, ex.: "320px" */
    minHeight: cssLength.optional().meta({ label: "Altura mínima", example: "320px" }),
  }),
});
