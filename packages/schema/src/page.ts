// Home e páginas extras (SPEC §5.3): content/home.json e content/pages/<slug>.json.
import { z } from "zod";
import { slugSchema } from "./fields";
import { getSectionDefinition, sectionSchema, type Section } from "./sections";

/** Slugs que não podem ser página (rotas dos módulos e do Next), mesmo com o módulo desligado. */
export const RESERVED_PAGE_SLUGS = ["produtos", "produto", "servicos", "servico", "ultimos-projetos", "api", "_next", "home"] as const;

export const pageSlugSchema = slugSchema.refine((s) => !(RESERVED_PAGE_SLUGS as readonly string[]).includes(s), {
  error: (iss) => `"${String(iss.input)}" é reservado (${RESERVED_PAGE_SLUGS.join(", ")}): escolha outro slug`,
});

// limits de cada definição: maxPerPage e homeOnly
function sectionList(where: "home" | "page") {
  return z.array(sectionSchema).superRefine((sections: Section[], ctx) => {
    const counts = new Map<string, number>();
    sections.forEach((section, i) => {
      const { limits, label } = getSectionDefinition(section.type);
      const n = (counts.get(section.type) ?? 0) + 1;
      counts.set(section.type, n);
      if (limits.maxPerPage !== undefined && n > limits.maxPerPage) {
        ctx.addIssue({ code: "custom", path: [i], message: `a seção "${section.type}" (${label}) pode aparecer no máximo ${limits.maxPerPage} vez(es) por página` });
      }
      if (limits.homeOnly && where === "page") {
        ctx.addIssue({ code: "custom", path: [i], message: `a seção "${section.type}" (${label}) só pode ficar na home` });
      }
    });
  });
}

export const homeSchema = z.strictObject({
  sections: sectionList("home").meta({ label: "Seções" }),
});

export const pageSchema = z.strictObject({
  title: z.string().min(1).meta({ label: "Título da página" }),
  description: z.string().min(1).optional().meta({ label: "Descrição (SEO)", ask: "optional" }),
  sections: sectionList("page").meta({ label: "Seções", ask: "never" }),
});

export type Home = z.output<typeof homeSchema>;
export type Page = z.output<typeof pageSchema>;
