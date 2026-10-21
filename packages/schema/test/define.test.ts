import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineSection, fieldAsk, fieldMeta, sectionBase } from "../src";

const ok = () =>
  defineSection({
    type: "exemplo",
    module: "core",
    label: "Exemplo",
    description: "Seção de teste.",
    fields: sectionBase.extend({
      items: z
        .array(z.strictObject({ q: z.string().min(1).meta({ label: "Pergunta" }) }))
        .min(1)
        .meta({ label: "Itens", ask: "always" }),
      nota: z.string().optional(),
    }),
    presets: [{ id: "um", label: "Um item", value: { items: [{ q: "A?" }] } }],
    limits: { maxPerPage: 1 },
  });

describe("defineSection", () => {
  it("devolve type, module, label, description, schema, presets e limits", () => {
    const def = ok();
    expect(def.type).toBe("exemplo");
    expect(def.module).toBe("core");
    expect(def.label).toBe("Exemplo");
    expect(def.description).toBe("Seção de teste.");
    expect(def.presets).toHaveLength(1);
    expect(def.limits).toEqual({ maxPerPage: 1 });
  });

  it("o schema é strict e tem o type literal", () => {
    const { schema } = ok();
    expect(schema.safeParse({ type: "exemplo", items: [{ q: "a" }] }).success).toBe(true);
    expect(schema.safeParse({ type: "outro", items: [{ q: "a" }] }).success).toBe(false);
    expect(schema.safeParse({ type: "exemplo", items: [{ q: "a" }], extra: 1 }).success).toBe(false);
  });

  it("presets e limits são opcionais", () => {
    const def = defineSection({
      type: "vazia",
      module: "gallery",
      label: "Vazia",
      description: "Sem campos.",
      fields: z.object({}),
    });
    expect(def.presets).toEqual([]);
    expect(def.limits).toEqual({});
  });

  it("campo obrigatório (perguntado) sem label falha", () => {
    expect(() =>
      defineSection({ type: "x", module: "core", label: "X", description: "X", fields: z.object({ nome: z.string() }) }),
    ).toThrow(/nome.*label/);
  });

  it("campo dentro do item de uma lista, perguntado e sem label, falha", () => {
    expect(() =>
      defineSection({
        type: "x",
        module: "core",
        label: "X",
        description: "X",
        fields: z.object({ items: z.array(z.object({ q: z.string() })).meta({ label: "Itens" }) }),
      }),
    ).toThrow(/items\[\]\.q.*label/);
  });

  it('campo opcional com ask "optional" e sem label falha', () => {
    expect(() =>
      defineSection({
        type: "x",
        module: "core",
        label: "X",
        description: "X",
        fields: z.object({ nota: z.string().optional().meta({ ask: "optional" }) }),
      }),
    ).toThrow(/nota.*label/);
  });

  it("campo opcional sem label passa (não é perguntado)", () => {
    expect(() =>
      defineSection({ type: "x", module: "core", label: "X", description: "X", fields: z.object({ nota: z.string().optional() }) }),
    ).not.toThrow();
  });

  it("metadado inválido falha", () => {
    expect(() =>
      defineSection({
        type: "x",
        module: "core",
        label: "X",
        description: "X",
        fields: z.object({ nota: z.string().meta({ label: "Nota", ask: "as-vezes" }) }),
      }),
    ).toThrow(/nota.*meta/);
  });

  it("preset que não valida falha", () => {
    expect(() =>
      defineSection({
        type: "x",
        module: "core",
        label: "X",
        description: "X",
        fields: z.object({ n: z.number().meta({ label: "N" }) }),
        presets: [{ id: "ruim", label: "Ruim", value: { n: "texto" } as never }],
      }),
    ).toThrow(/preset "ruim"/);
  });

  it("type fora de kebab-case falha", () => {
    expect(() =>
      defineSection({ type: "Hero_Big", module: "core", label: "X", description: "X", fields: z.object({}) }),
    ).toThrow(/kebab/);
  });
});

describe("fieldMeta e fieldAsk", () => {
  it("obrigatório pergunta sempre; opcional e com padrão não perguntam", () => {
    expect(fieldAsk(z.string())).toBe("always");
    expect(fieldAsk(z.string().optional())).toBe("never");
    expect(fieldAsk(z.boolean().default(true))).toBe("never");
    expect(fieldAsk(z.string().optional().meta({ ask: "optional" }))).toBe("optional");
  });

  it("lê o metadado da instância", () => {
    expect(fieldMeta(z.string().meta({ label: "L" }))).toEqual({ label: "L" });
    expect(fieldMeta(z.string())).toBeUndefined();
  });
});
