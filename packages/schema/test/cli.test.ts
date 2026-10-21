import { describe, expect, it } from "vitest";
import { EXIT_CODES, cliResultSchema } from "../src";

describe("CliResult (§5.7)", () => {
  it("códigos de saída da spec", () => {
    expect(EXIT_CODES).toEqual({
      INTERNAL: 1,
      USAGE: 2,
      MISSING_REQUIRED: 3,
      VALIDATION: 4,
      CONFLICT: 5,
      ENVIRONMENT: 6,
      CONFIG_NOT_EDITABLE: 7,
      CANCELLED: 130,
    });
  });

  it("aceita o envelope de erro do exemplo da spec", () => {
    const r = cliResultSchema.safeParse({
      schemaVersion: 1,
      ok: false,
      command: "product add",
      data: null,
      changes: [],
      warnings: [],
      error: {
        code: "MISSING_REQUIRED",
        exitCode: 3,
        message: "Faltam campos obrigatórios: price, category.",
        hint: "iris product add piso-x --yes",
        missing: ["--price", "--category"],
      },
    });
    expect(r.success).toBe(true);
  });

  it("aceita o envelope de sucesso", () => {
    const r = cliResultSchema.safeParse({
      schemaVersion: 1,
      ok: true,
      command: "product add",
      data: { slug: "piso-x" },
      changes: [{ path: "content/products/piso-x.json", action: "create" }],
      warnings: [{ level: "warning", file: "content/products/piso-x.json", message: "Sem botão de compra." }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita envelope incoerente", () => {
    const base = { schemaVersion: 1, command: "x", changes: [], warnings: [] };
    expect(cliResultSchema.safeParse({ ...base, ok: true, data: null, error: { code: "USAGE", exitCode: 2, message: "m" } }).success).toBe(false);
    expect(cliResultSchema.safeParse({ ...base, ok: false, data: null, error: { code: "USAGE", exitCode: 3, message: "m" } }).success).toBe(false);
    expect(cliResultSchema.safeParse({ ...base, ok: false, data: null }).success).toBe(false);
    expect(cliResultSchema.safeParse({ ...base, schemaVersion: 2, ok: true, data: 1 }).success).toBe(false);
    expect(cliResultSchema.safeParse({ ...base, ok: true, data: 1, changes: [{ path: "a", action: "move" }] }).success).toBe(false);
  });
});
