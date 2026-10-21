import { describe, expect, it } from "vitest";
import { buildJsonSchemas } from "../src/json-schema";

type Json = Record<string, unknown>;
const files = buildJsonSchemas();
const props = (s: unknown) => (s as { properties: Json }).properties;
const required = (s: unknown) => ((s as { required?: string[] }).required ?? []);

function walk(node: unknown, visit: (n: Json) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Json);
    Object.values(node).forEach((n) => walk(n, visit));
  }
}

describe("JSON Schema publicado", () => {
  it("gera os 5 arquivos", () => {
    expect(Object.keys(files).sort()).toEqual([
      "home.schema.json",
      "page.schema.json",
      "product.schema.json",
      "section.schema.json",
      "service.schema.json",
    ]);
  });

  it("product: whatsappButton não é obrigatório (io: input); kind e slug não existem", () => {
    const p = files["product.schema.json"];
    expect(props(p).whatsappButton).toBeDefined();
    expect(required(p)).not.toContain("whatsappButton");
    expect(required(p)).toEqual(expect.arrayContaining(["name", "price", "category", "images", "stockQty"]));
    expect(props(p).kind).toBeUndefined();
    expect(props(p).slug).toBeUndefined();
  });

  it("as 4 raízes de arquivo declaram $schema (opcional) e são fechadas", () => {
    for (const name of ["home", "page", "product", "service"]) {
      const s = files[`${name}.schema.json`];
      expect(props(s).$schema, name).toEqual(expect.objectContaining({ type: "string" }));
      expect(required(s), name).not.toContain("$schema");
      expect((s as Json).additionalProperties, name).toBe(false);
    }
    expect((files["section.schema.json"] as Json).properties).toBeUndefined();
  });

  it("section: uma variante por tipo de seção", () => {
    const variants = (files["section.schema.json"] as { oneOf?: unknown[]; anyOf?: unknown[] });
    expect((variants.oneOf ?? variants.anyOf)?.length).toBe(13);
  });

  it("metadados: label vira title; ask, input, order e example não vazam", () => {
    for (const [name, s] of Object.entries(files)) {
      walk(s, (n) => {
        for (const key of ["label", "ask", "input", "order", "example"]) {
          // campo com esse nome (ex.: "order" do produto, "label" do link) aparece como objeto em properties
          expect(typeof n[key] === "string" || typeof n[key] === "number" ? key : null, `${name}`).toBeNull();
        }
      });
    }
    expect((props(files["product.schema.json"]).price as Json).title).toBe("Preço à vista");
  });

  it("a saída é determinística", () => {
    expect(JSON.stringify(buildJsonSchemas())).toBe(JSON.stringify(files));
  });
});
