import { defineConfig } from "tsdown";

// ESM + .d.mts em dist/ (SPEC §5.1). Um arquivo por subpath de "exports" (SPEC §5.6).
// Os chunks ficam todos em dist/, então new URL("../themes/", import.meta.url) acha packages/engine/themes/.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    next: "src/next.ts",
    theme: "src/theme/index.ts",
    codegen: "src/codegen/index.ts",
    content: "src/content/index.ts",
  },
  format: "esm",
  platform: "node",
  target: "node22.18",
  dts: true,
  clean: true,
});
