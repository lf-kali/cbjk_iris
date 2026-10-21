// Link de botão: rota/URL ou WhatsApp (true = mensagem geral; texto = mensagem própria).
import { z } from "zod";
import { siteHref } from "./fields";

const label = z.string().min(1).meta({ label: "Texto do botão" });

export const siteLinkSchema = z
  .union([
    z.strictObject({ label, href: siteHref.meta({ label: "Destino", example: "/sobre", input: "url" }) }),
    z.strictObject({
      label,
      whatsapp: z
        .union([z.literal(true), z.string().min(1)])
        .meta({ label: "Mensagem do WhatsApp", description: "true = mensagem geral do site; um texto = mensagem própria" }),
    }),
  ])
  .meta({ label: "Botão", input: "link" });

export type SiteLink = z.output<typeof siteLinkSchema>;
