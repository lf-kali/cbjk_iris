import { describe, expect, it } from "vitest";
import { inexactNumbers } from "../src/modules/json-numbers";

// Conferência de exatidão dos números antes de regravar um JSON (removeModuleContent).

describe("inexactNumbers", () => {
  it("acusa os números que o JSON.stringify mudaria e deixa passar diferença só de forma", () => {
    const text = `{"a": [1e400, 12345678901234567890, 0.1000000000000000055511151231257827, 1.0, 19.90, 1e3, 0, -3, "1e400"]}`;
    expect(inexactNumbers(text)).toEqual(["1e400", "12345678901234567890", "0.1000000000000000055511151231257827"]);
  });

  it("literal enorme (~500 mil caracteres) é recusado rápido, sem cálculo quadrático", () => {
    const literal = `0.1${"0".repeat(500_000)}1`;
    const started = performance.now();
    const found = inexactNumbers(`{"v": ${literal}}`);
    const elapsed = performance.now() - started;
    expect(found).toHaveLength(1);
    expect(found[0].length).toBe(literal.length);
    expect(elapsed).toBeLessThan(100);
  });

  it("muitos zeros no fim de um literal curto também não custam caro", () => {
    const literal = `1${"0".repeat(300)}`; // 1e300, exato e abaixo do limite de tamanho
    expect(inexactNumbers(`[${literal}]`)).toEqual([]);
  });
});
