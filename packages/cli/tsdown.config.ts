import { defineConfig } from "tsdown";

// ESM + .d.mts em dist/ (SPEC §5.1: pacotes compilados pelo tsdown)
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "node",
  target: "node22.18",
  dts: true,
  clean: true,
});
