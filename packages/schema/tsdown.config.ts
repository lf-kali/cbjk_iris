import { defineConfig } from "tsdown";

// ESM + .d.mts em dist/ (SPEC §5.1: pacotes compilados pelo tsdown).
// - index: o pacote inteiro (com zod);
// - defaults: subpath ./defaults, sem zod (vai para o navegador; teste defaults-isolation);
// - json-schema: interno, usado só por scripts/write-json.mjs no build.
export default defineConfig({
  entry: { index: "src/index.ts", defaults: "src/defaults.ts", "json-schema": "src/json-schema.ts" },
  format: "esm",
  platform: "node",
  target: "node22.18",
  dts: true,
  clean: true,
});
