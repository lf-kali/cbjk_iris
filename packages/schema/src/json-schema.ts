// JSON Schema publicado em @cbjk_iris/schema/json/ (SPEC §5.3 e §5.5). Entrada interna do tsdown
// (dist/json-schema.mjs), fora do "exports"; scripts/write-json.mjs grava os arquivos no build.
import { z } from "zod";
import { productContentSchema, serviceContentSchema } from "./catalog";
import { homeSchema, pageSchema } from "./page";
import { sectionSchema } from "./sections";

type JsonObject = Record<string, unknown>;

// .meta() vira palavra-chave do JSON Schema: label → title, example → examples;
// ask, input e order são da CLI e não vão para o editor
function override(ctx: { zodSchema: unknown; jsonSchema: JsonObject }) {
  const js = ctx.jsonSchema;
  if (typeof js.label === "string" && js.title === undefined) js.title = js.label;
  if (typeof js.example === "string") js.examples = [js.example];
  for (const key of ["label", "example", "ask", "input", "order"]) {
    if (typeof js[key] !== "object") delete js[key];
  }
}

function toJson(schema: z.ZodType, withSchemaKey: boolean): JsonObject {
  const js = z.toJSONSchema(schema, { io: "input", override }) as JsonObject;
  if (!withSchemaKey) return js;
  // os schemas são strict; a chave $schema do arquivo é aceita aqui e removida pelo loader
  const properties = { $schema: { type: "string", description: "Caminho do JSON Schema (autocomplete no editor)" }, ...(js.properties as JsonObject) };
  return { ...js, properties };
}

/** Nome do arquivo → JSON Schema. Gerado com io: "input" (campo com padrão não é obrigatório). */
export function buildJsonSchemas(): Record<string, JsonObject> {
  return {
    "section.schema.json": toJson(sectionSchema, false),
    "home.schema.json": toJson(homeSchema, true),
    "page.schema.json": toJson(pageSchema, true),
    "product.schema.json": toJson(productContentSchema, true),
    "service.schema.json": toJson(serviceContentSchema, true),
  };
}
