import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { homeSchema, pageSchema, pageSlugSchema, productContentSchema, ptBRError, serviceContentSchema } from "../src";

// Cada JSON de apps/site/content valida no schema do seu tipo (SPEC §6.1, "Pronto quando"), e o
// $schema de cada um aponta para o JSON Schema gerado (SPEC §5.1.4). O loader, que remove o $schema
// antes de validar, é testado no engine (test/content.test.ts).
const SITE = path.resolve(__dirname, "../../../apps/site");
const CONTENT = path.join(SITE, "content");
const JSON_DIR = path.resolve(__dirname, "../json");

type Kind = { file: string; type: "home" | "page" | "product" | "service"; schema: z.ZodType };

function files(): Kind[] {
  const list = (sub: string, type: Kind["type"], schema: z.ZodType) =>
    readdirSync(path.join(CONTENT, sub))
      .filter((f) => !f.startsWith("."))
      .map((f) => ({ file: path.join(CONTENT, sub, f), type, schema }));
  return [
    { file: path.join(CONTENT, "home.json"), type: "home", schema: homeSchema },
    ...list("pages", "page", pageSchema),
    ...list("products", "product", productContentSchema),
    ...list("services", "service", serviceContentSchema),
  ];
}

type ProductContent = z.output<typeof productContentSchema>;

/** Classifica um produto pela combinação de botões (o externalLink conta como loja externa). */
function buttonCombo(p: ProductContent): "whatsapp" | "marketplaces" | "todos" | "nenhum" | "misto" {
  const markets = [p.mercadoLivreLink, p.shopeeLink, p.amazonLink].filter(Boolean).length;
  if (p.whatsappButton && markets === 3) return "todos";
  if (p.whatsappButton && markets === 0 && !p.externalLink) return "whatsapp";
  if (!p.whatsappButton && markets > 0 && !p.externalLink) return "marketplaces";
  if (!p.whatsappButton && markets === 0 && !p.externalLink) return "nenhum";
  return "misto";
}

describe("apps/site/content", () => {
  const all = files();

  it("tem a home, 2 páginas, 5 produtos e 4 serviços", () => {
    expect(all.map((f) => f.type).sort()).toEqual(["home", "page", "page", ...Array(5).fill("product"), ...Array(4).fill("service")]);
  });

  // SPEC §6.1.1: os produtos de exemplo cobrem as combinações de botões de compra
  it("os produtos cobrem só WhatsApp, só marketplaces, todos os botões e nenhum botão", () => {
    const combos = all
      .filter((f) => f.type === "product")
      .map((f) => {
        const { $schema, ...data } = JSON.parse(readFileSync(f.file, "utf8"));
        expect($schema).toBeTypeOf("string");
        return buttonCombo(productContentSchema.parse(data));
      });
    expect(combos).toEqual(expect.arrayContaining(["whatsapp", "marketplaces", "todos", "nenhum"]));
  });

  it.each(all.map((f) => [path.relative(SITE, f.file), f] as const))("%s valida (sem o $schema)", (_rel, { file, schema, type }) => {
    expect(path.basename(file)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/);
    if (type === "page") expect(pageSlugSchema.safeParse(path.basename(file, ".json")).success).toBe(true);
    const { $schema, ...data } = JSON.parse(readFileSync(file, "utf8"));
    expect(typeof $schema).toBe("string");
    const r = schema.safeParse(data, { error: ptBRError });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it.each(all.map((f) => [path.relative(SITE, f.file), f] as const))("%s: $schema relativo aponta para json/<tipo>.schema.json", (_rel, { file, type }) => {
    const { $schema } = JSON.parse(readFileSync(file, "utf8"));
    const target = path.join(JSON_DIR, `${type}.schema.json`);
    expect($schema).toBe(path.relative(path.dirname(file), target).split(path.sep).join("/"));
    expect(existsSync(path.resolve(path.dirname(file), $schema))).toBe(true);
  });

  it("os schemas são strict: sem remover o $schema, a validação falha", () => {
    const { file, schema } = all.find((f) => f.type === "product")!;
    expect(schema.safeParse(JSON.parse(readFileSync(file, "utf8"))).success).toBe(false);
  });
});
