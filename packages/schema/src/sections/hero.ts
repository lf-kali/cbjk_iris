import { z } from "zod";
import { defineSection, sectionBase } from "../define";
import { imageSrc, siteHref } from "../fields";
import { siteLinkSchema } from "../links";

const slide = z.strictObject({
  image: imageSrc.meta({ label: "Imagem", input: "image", example: "/home/slide-1.jpg" }),
  alt: z.string().min(1).meta({ label: "Descrição da imagem", description: "Texto alternativo, para leitores de tela" }),
  title: z.string().min(1).meta({ label: "Título" }),
  subtitle: z.string().min(1).optional().meta({ label: "Subtítulo", ask: "optional" }),
  /** botão principal do slide */
  cta: siteLinkSchema.optional().meta({ label: "Botão principal", input: "link" }),
  /** segundo botão, com estilo discreto */
  secondaryCta: siteLinkSchema.optional().meta({ label: "Botão secundário", input: "link" }),
  /** torna o slide inteiro clicável (útil para banners de promoção sem botão) */
  href: siteHref.optional().meta({ label: "Link do slide inteiro", input: "url" }),
  /** posição do texto */
  align: z.enum(["left", "center", "right"]).optional().meta({ label: "Alinhamento do texto", input: "select" }),
});

export const hero = defineSection({
  type: "hero",
  module: "core",
  label: "Banner principal",
  description: "Carrossel de imagens grandes com título e botões.",
  fields: sectionBase.pick({ id: true }).extend({
    slides: z.array(slide).min(1).meta({ label: "Slides", ask: "always" }),
    autoplay: z.boolean().optional().meta({ label: "Passar sozinho", input: "confirm" }),
    /** ms entre slides */
    interval: z.number().int().positive().optional().meta({ label: "Intervalo (ms)", input: "number" }),
    height: z.enum(["sm", "md", "lg", "full"]).optional().meta({ label: "Altura", input: "select" }),
  }),
  presets: [
    {
      id: "basico",
      label: "Um slide com botão do WhatsApp",
      value: {
        height: "lg",
        slides: [
          {
            image: "/home/slide-1.jpg",
            alt: "Foto principal da loja",
            title: "Bem-vindo à nossa loja",
            subtitle: "Atendimento rápido pelo WhatsApp.",
            cta: { label: "Fale com a gente", whatsapp: true },
          },
        ],
      },
    },
  ],
  limits: { maxPerPage: 1 },
});
