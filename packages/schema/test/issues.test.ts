import { describe, expect, it } from "vitest";
import { formatIssuePath, ptBRError } from "../src";
import { z } from "zod";

describe("formatIssuePath", () => {
  it("monta o caminho no formato das mensagens do build", () => {
    expect(formatIssuePath(["sections", 2, "items", 0, "answer"])).toBe("sections[2].items[0].answer");
    expect(formatIssuePath(["brand", "colors", "primary"])).toBe("brand.colors.primary");
    expect(formatIssuePath([0, "a"])).toBe("[0].a");
    expect(formatIssuePath([])).toBe("(raiz)");
  });
});

describe("ptBRError", () => {
  it("traduz as mensagens padrão do zod sem mudar a config global", () => {
    const s = z.object({ a: z.string() });
    expect(s.safeParse({}, { error: ptBRError }).error?.issues[0].message).toMatch(/esperava/);
    expect(s.safeParse({}).error?.issues[0].message).toMatch(/expected/);
  });
});
